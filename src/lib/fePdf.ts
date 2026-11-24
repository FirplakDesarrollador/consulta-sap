import { fetchSapBinary, querySapServiceLayer } from '@/lib/sapClient';
import { HBT_DOC_TYPES } from '@/lib/hbt';
import type { HbtDocType } from '@/types/hbt';

/**
 * PDF (representación gráfica) de un documento electrónico. SOLO LECTURA: únicamente GET a SAP y a Facture.
 *
 * Cadena de fuentes (la primera que responda un PDF real):
 *  1. `facture`        – campo U_HBT_VisorPublico → API pública de Facture
 *                        GET https://api.facture.co/PLColab.Documents/Document/<id>/RepresentacionGrafica/Binario
 *                        (la misma llamada que hace su visor público; el visor en sí no se puede incrustar: X-Frame-Options SAMEORIGIN).
 *  2. `sap-attachment` – primer archivo de Attachments2(<AttachmentEntry>) vía `$value` del Service Layer,
 *                        solo si su nombre parece una factura (no se mezcla con remisiones/órdenes de compra).
 *  Forzable con ?source=facture|sap-attachment (el adjunto SAP se sirve aunque su nombre no parezca factura).
 */

export type PdfSourceId = 'facture' | 'sap-attachment';

export interface PdfSourceInfo {
  id: PdfSourceId;
  label: string;
  available: boolean;
  fileName?: string;
  reason?: string;
}

export interface PdfInfo {
  type: HbtDocType;
  docEntry: number;
  docNum: number | null;
  viewerUrl: string | null;
  sources: PdfSourceInfo[];
  /** Fuente que usaría la cadena automática */
  preferred: PdfSourceId | null;
}

export interface PdfResult {
  ok: boolean;
  status: number;
  error?: string;
  info?: PdfInfo;
  pdf?: { body: Buffer; fileName: string; source: PdfSourceId };
}

// plataformav3 es el host anterior del mismo visor (facturas antiguas); comparten la misma API
const FACTURE_VIEWER_HOSTS = new Set(['plataforma.facture.co', 'plataformav3.facture.co']);
const FACTURE_API = 'https://api.facture.co/PLColab.Documents/Document';
const VIEWER_PATH = /^\/publicViewer\/(?:public-viewer|public-history-viewer)\/([A-Za-z0-9_=+%-]{16,400})\/?$/;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30000;

/** Valida el valor de U_HBT_VisorPublico (solo https://plataforma[v3].facture.co/publicViewer/...) y devuelve el id del documento */
export function parseFactureViewerUrl(raw: unknown): { id: string; viewerUrl: string } | null {
  if (typeof raw !== 'string') return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !FACTURE_VIEWER_HOSTS.has(u.hostname) || u.port || u.username || u.password) return null;
  const m = VIEWER_PATH.exec(u.pathname);
  if (!m) return null;
  return { id: m[1], viewerUrl: `https://${u.hostname}${u.pathname}` };
}

function safeFileName(name: string, fallback: string): string {
  const clean = name.replace(/[^\w.\- ()]+/g, '_').replace(/^\.+/, '').slice(0, 120).trim();
  return clean || fallback;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { method: 'GET', signal: ctrl.signal, cache: 'no-store', headers: { Accept: '*/*' } });
  } finally {
    clearTimeout(t);
  }
}

const isPdf = (b: Buffer) => b.length > 8 && b.subarray(0, 5).toString('latin1') === '%PDF-';

// Caché pequeña en memoria (el iframe, "descargar" y "abrir" piden el mismo archivo)
const cache = new Map<string, { at: number; value: { body: Buffer; fileName: string } }>();
const CACHE_MS = 5 * 60 * 1000;
function cacheGet(k: string) {
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  cache.delete(k);
  return null;
}
function cacheSet(k: string, value: { body: Buffer; fileName: string }) {
  if (cache.size >= 12) cache.delete(cache.keys().next().value as string);
  cache.set(k, { at: Date.now(), value });
}

async function getFacturePdf(id: string, fallbackName: string): Promise<{ body?: Buffer; fileName?: string; status: number; error?: string }> {
  const key = `facture:${id}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, status: 200 };
  try {
    const res = await fetchWithTimeout(`${FACTURE_API}/${id}/RepresentacionGrafica/Binario`);
    if (!res.ok) return { status: res.status === 404 ? 404 : 502, error: `Facture respondió HTTP ${res.status}` };
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_PDF_BYTES) return { status: 502, error: 'El PDF de Facture supera el tamaño máximo permitido' };
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > MAX_PDF_BYTES) return { status: 502, error: 'El PDF de Facture supera el tamaño máximo permitido' };
    if (!isPdf(body)) return { status: 502, error: 'Facture no devolvió un PDF válido' };
    const cd = res.headers.get('content-disposition') || '';
    const fm = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    const fileName = safeFileName(fm ? decodeURIComponent(fm[1]) : '', fallbackName);
    cacheSet(key, { body, fileName });
    return { body, fileName, status: 200 };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return { status: 502, error: aborted ? 'Facture no respondió a tiempo' : 'No se pudo conectar con Facture' };
  }
}

interface AttachLine {
  FileName?: string;
  FileExtension?: string;
}

async function getAttachmentMeta(entry: number): Promise<{ name: string; ext: string } | null> {
  const r = await querySapServiceLayer<{ Attachments2_Lines?: AttachLine[] }>(`Attachments2(${entry})`, { method: 'GET', params: { $select: 'AbsoluteEntry,Attachments2_Lines' } });
  const first = r.success ? r.data?.Attachments2_Lines?.[0] : undefined;
  if (!first) return null;
  return { name: String(first.FileName ?? ''), ext: String(first.FileExtension ?? '').toLowerCase() };
}

/** Nombre de adjunto que parece la factura: contiene el DocNum o "factura/fe/fev/inv" */
function looksLikeInvoice(name: string, docNum: number | null): boolean {
  const n = name.toLowerCase();
  if (docNum !== null && new RegExp(`(^|\\D)${docNum}(\\D|$)`).test(n)) return true;
  return /factura|\bfev?\b|\bfe[-_ ]?\d|invoice/.test(n);
}

/**
 * Resuelve el PDF de un documento. `wantBody=false` solo describe las fuentes (para el visor: no descarga el PDF).
 */
export async function resolveDocumentPdf(
  type: HbtDocType,
  docEntry: number,
  opts: { source?: PdfSourceId | 'auto'; wantBody: boolean }
): Promise<PdfResult> {
  const dt = HBT_DOC_TYPES[type];
  const doc = await querySapServiceLayer<Record<string, unknown>>(`${dt.entity}(${docEntry})`, {
    method: 'GET',
    params: { $select: 'DocEntry,DocNum,AttachmentEntry,U_HBT_VisorPublico' }
  });
  if (!doc.success || !doc.data) {
    if (doc.error && !/HTTP 404/.test(doc.error)) return { ok: false, status: 502, error: 'No se pudo consultar el documento en SAP' };
    return { ok: false, status: 404, error: `No se encontró el documento ${docEntry} en ${dt.label}` };
  }
  const docNum = typeof doc.data.DocNum === 'number' ? doc.data.DocNum : Number(doc.data.DocNum) || null;
  const fallbackName = `${type === 'invoices' ? 'Factura' : dt.label.replace(/\s+/g, '_')}_${docNum ?? docEntry}.pdf`;
  const viewer = parseFactureViewerUrl(doc.data.U_HBT_VisorPublico);
  const attachEntry = typeof doc.data.AttachmentEntry === 'number' ? doc.data.AttachmentEntry : null;

  const sources: PdfSourceInfo[] = [];

  // 1) Facture
  const factureSrc: PdfSourceInfo = { id: 'facture', label: 'Representación gráfica (Facture)', available: false };
  if (!viewer) {
    factureSrc.reason = doc.data.U_HBT_VisorPublico ? 'La URL del visor (HBT_VisorPublico) no es de Facture' : 'El documento no tiene URL del visor de Facture (HBT_VisorPublico vacío: aún no se envía a facturación electrónica)';
  }
  // 2) Adjunto SAP
  const attSrc: PdfSourceInfo = { id: 'sap-attachment', label: 'Adjunto de SAP (primer archivo)', available: false };
  let attLooksInvoice = false;
  if (attachEntry === null) attSrc.reason = 'El documento no tiene adjuntos en SAP';
  else {
    const meta = await getAttachmentMeta(attachEntry);
    if (!meta) attSrc.reason = 'No se pudieron leer los adjuntos de SAP';
    else if (meta.ext !== 'pdf') attSrc.reason = `El primer adjunto no es PDF (${meta.ext || 'sin extensión'})`;
    else {
      attSrc.available = true;
      attSrc.fileName = safeFileName(`${meta.name}.pdf`, `Adjunto_${attachEntry}.pdf`);
      attLooksInvoice = looksLikeInvoice(meta.name, docNum);
      if (!attLooksInvoice) attSrc.reason = 'El nombre del adjunto no parece una factura; solo se muestra si se elige manualmente';
    }
  }

  let facturePdf: Awaited<ReturnType<typeof getFacturePdf>> | null = null;
  const wantFacture = opts.source === 'facture' || opts.source === 'auto' || opts.source === undefined;
  const wantAttach = opts.source === 'sap-attachment' || opts.source === 'auto' || opts.source === undefined;

  if (viewer && wantFacture) {
    facturePdf = await getFacturePdf(viewer.id, fallbackName);
    if (facturePdf.body) {
      factureSrc.available = true;
      factureSrc.fileName = facturePdf.fileName;
    } else {
      factureSrc.reason = facturePdf.error;
    }
  } else if (viewer) {
    factureSrc.available = true; // no se comprobó (fuente no solicitada)
  }
  sources.push(factureSrc, attSrc);

  const autoAttach = attSrc.available && attLooksInvoice;
  const preferred: PdfSourceId | null = factureSrc.available ? 'facture' : autoAttach ? 'sap-attachment' : null;
  const info: PdfInfo = { type, docEntry, docNum, viewerUrl: viewer?.viewerUrl ?? null, sources, preferred };

  if (!opts.wantBody) return { ok: true, status: 200, info };

  if (facturePdf?.body && (opts.source === 'facture' || opts.source === 'auto' || opts.source === undefined)) {
    return { ok: true, status: 200, info, pdf: { body: facturePdf.body, fileName: facturePdf.fileName || fallbackName, source: 'facture' } };
  }
  const forcedAttach = opts.source === 'sap-attachment';
  if (wantAttach && attachEntry !== null && attSrc.available && (forcedAttach || autoAttach)) {
    const key = `att:${attachEntry}`;
    let hit = cacheGet(key);
    if (!hit) {
      const bin = await fetchSapBinary(`Attachments2(${attachEntry})/$value`, MAX_PDF_BYTES);
      if (bin.success && bin.body && isPdf(bin.body)) {
        hit = { body: bin.body, fileName: attSrc.fileName || fallbackName };
        cacheSet(key, hit);
      }
    }
    if (hit) return { ok: true, status: 200, info, pdf: { body: hit.body, fileName: hit.fileName, source: 'sap-attachment' } };
    attSrc.available = false;
    attSrc.reason = 'SAP no devolvió el archivo adjunto como PDF';
  }

  const upstreamFailed = facturePdf && !facturePdf.body && facturePdf.status !== 404;
  const reasons = sources.filter((s) => !s.available && s.reason).map((s) => `${s.label}: ${s.reason}`);
  return {
    ok: false,
    status: upstreamFailed ? 502 : 404,
    info,
    error: `No hay un PDF disponible para este documento.${reasons.length ? ' ' + reasons.join(' · ') : ''}`
  };
}
