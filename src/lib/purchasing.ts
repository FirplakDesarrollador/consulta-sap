import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  DocumentRow,
  PurchaseDocDetail,
  PurchaseDocInput,
  PurchaseDocKind,
  PurchaseDocLine,
  PurchaseDocSource,
  PurchaseLineInput
} from '@/types/sapBusiness';

/**
 * Configuración de los documentos de compra soportados.
 *
 * Operaciones verificadas contra el $metadata del Service Layer (v1, 10.0):
 *  - EntitySet PurchaseOrders / PurchaseDeliveryNotes / Drafts → EntityType SAPB1.Document
 *  - Acciones enlazables (FunctionImport IsBindable) sobre SAPB1.Document: Cancel, Close, Reopen,
 *    CreateCancellationDocument
 *  - DraftsService_SaveDraftToDocument (global) para convertir un borrador en documento
 *
 * Según la guía oficial "Working with SAP Business One Service Layer" (§3.4.4) los documentos de
 * marketing NO se pueden borrar con DELETE (error -5006 "The requested action is not supported for this
 * object"). Solo los borradores (Drafts) admiten DELETE.
 *
 * Actualización: el SL admite PATCH (diferencial) y PUT (reemplazo: las propiedades omitidas se ponen
 * en su valor por defecto). Para documentos usamos SIEMPRE PATCH; el PUT de esta API se enruta a PATCH.
 */
export interface PurchaseDocConfig {
  kind: PurchaseDocKind;
  entity: 'PurchaseOrders' | 'PurchaseDeliveryNotes';
  draftObjectCode: 'oPurchaseOrders' | 'oPurchaseDeliveryNotes';
  table: string;
  lineTable: string;
  idPrefix: string;
  label: string;
  docType: DocumentRow['docType'];
  /** Acciones enlazables que el SL/SAP permite para este objeto */
  actions: { cancel: boolean; close: boolean; reopen: boolean };
  /** Campos de cabecera actualizables vía PATCH mientras el documento está abierto */
  updatableHeader: Array<'Comments' | 'NumAtCard' | 'DocDueDate' | 'TaxDate'>;
  /** Si se permiten modificar / agregar líneas vía PATCH */
  updatableLines: boolean;
}

export const PURCHASE_DOC_CONFIG: Record<PurchaseDocKind, PurchaseDocConfig> = {
  'purchase-orders': {
    kind: 'purchase-orders',
    entity: 'PurchaseOrders',
    draftObjectCode: 'oPurchaseOrders',
    table: 'OPOR',
    lineTable: 'POR1',
    idPrefix: 'OC',
    label: 'Orden de Compra',
    docType: 'Orden de Compra',
    actions: { cancel: true, close: true, reopen: true },
    updatableHeader: ['Comments', 'NumAtCard', 'DocDueDate', 'TaxDate'],
    updatableLines: true
  },
  'goods-receipts': {
    kind: 'goods-receipts',
    entity: 'PurchaseDeliveryNotes',
    draftObjectCode: 'oPurchaseDeliveryNotes',
    table: 'OPDN',
    lineTable: 'PDN1',
    idPrefix: 'EM',
    label: 'Entrada de Mercancía',
    docType: 'Entrada Mercancía',
    // La entrada ya contabilizada afecta inventario: solo se puede cancelar (genera documento de
    // cancelación) o cerrar. No admite Reopen ni cambios de líneas.
    actions: { cancel: true, close: true, reopen: false },
    updatableHeader: ['Comments', 'NumAtCard'],
    updatableLines: false
  }
};

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** SAP BaseType de Orden de Compra (OPOR) para copiar líneas a la entrada de mercancía */
export const BASE_TYPE_PURCHASE_ORDER = 22;

export function getPurchaseConfig(kind: string): PurchaseDocConfig | null {
  return (PURCHASE_DOC_CONFIG as Record<string, PurchaseDocConfig>)[kind] || null;
}

export function parseSource(raw: string | null): PurchaseDocSource {
  return raw === 'drafts' ? 'drafts' : 'documents';
}

/** Extrae un id numérico (DocEntry) aceptando prefijos tipo OC-123, EM-123, DRF-123 */
export function parseDocId(id: string): number | null {
  const clean = decodeURIComponent(id).replace(/^[A-Z]+-/i, '').trim();
  if (!/^\d+$/.test(clean)) return null;
  const n = parseInt(clean, 10);
  return n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Errores del Service Layer
// ---------------------------------------------------------------------------

export interface SlError {
  message: string;
  code?: number | string;
  httpStatus: number;
}

/** Convierte "SAP Service Layer HTTP 400: {json}" en un mensaje legible */
export function parseSlError(raw: string | undefined, fallback = 'Error en SAP Service Layer'): SlError {
  if (!raw) return { message: fallback, httpStatus: 502 };
  const m = raw.match(/^SAP Service Layer HTTP (\d{3}):\s*([\s\S]*)$/);
  if (!m) return { message: raw, httpStatus: 502 };
  const httpStatus = parseInt(m[1], 10);
  try {
    const body = JSON.parse(m[2]);
    const err = body?.error;
    const value = typeof err?.message === 'string' ? err.message : err?.message?.value;
    if (value) return { message: String(value), code: err?.code, httpStatus };
  } catch {
    // cuerpo no JSON
  }
  return { message: m[2] || raw, httpStatus };
}

export function slErrorResponse(raw: string | undefined, fallback: string) {
  const e = parseSlError(raw, fallback);
  const status = e.httpStatus >= 400 && e.httpStatus < 600 ? e.httpStatus : 502;
  return NextResponse.json(
    { success: false, error: e.message, sapErrorCode: e.code ?? null, sapHttpStatus: e.httpStatus },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Protección de escrituras
// ---------------------------------------------------------------------------

/**
 * Las escrituras (POST / PATCH / DELETE / acciones) solo se envían a SAP si la variable de entorno
 * SAP_ALLOW_WRITES=true está definida. Además, cualquier escritura acepta ?dryRun=1 para devolver
 * la petición exacta que se enviaría al Service Layer sin ejecutarla.
 */
export function sapWritesEnabled(): boolean {
  return process.env.SAP_ALLOW_WRITES === 'true';
}

export interface SlWritePlan {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  description: string;
}

/**
 * Devuelve una respuesta si la escritura NO debe ejecutarse (dry-run o escrituras deshabilitadas),
 * o null si se puede ejecutar.
 */
export function guardWrite(request: Request, plan: SlWritePlan): NextResponse | null {
  const url = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes((url.searchParams.get('dryRun') || '').toLowerCase());
  const preview = { method: plan.method, path: `/b1s/v1/${plan.path}`, body: plan.body ?? null };

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: `Simulación: no se envió nada a SAP. ${plan.description}`,
      request: preview
    });
  }

  if (!sapWritesEnabled()) {
    return NextResponse.json(
      {
        success: false,
        writesDisabled: true,
        error:
          'Las escrituras en SAP están deshabilitadas en este entorno (defina SAP_ALLOW_WRITES=true para habilitarlas). No se envió nada a SAP.',
        request: preview
      },
      { status: 403 }
    );
  }

  return null;
}

export async function executeWrite<T = unknown>(plan: SlWritePlan) {
  // Defensa en profundidad: nunca escribir en SAP si SAP_ALLOW_WRITES no está activo
  if (!sapWritesEnabled()) {
    return { success: false as const, data: undefined as T | undefined, error: 'Escrituras en SAP deshabilitadas (SAP_ALLOW_WRITES)' };
  }
  return querySapServiceLayer<T>(plan.path, { method: plan.method, body: plan.body });
}

// ---------------------------------------------------------------------------
// Validación de entradas
// ---------------------------------------------------------------------------

const CODE_RE = /^[A-Za-z0-9._\-\/ ]{1,50}$/;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface ValidationResult<T> {
  ok: boolean;
  errors: string[];
  value?: T;
}

function validateLine(
  raw: unknown,
  idx: number,
  errors: string[],
  opts: { allowLineNum: boolean; allowBase: boolean }
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`Línea ${idx + 1}: formato inválido`);
    return null;
  }
  const l = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const label = `Línea ${idx + 1}`;

  const lineNum = num(l.lineNum);
  const isExisting = opts.allowLineNum && lineNum !== null;
  if (isExisting) {
    if (!Number.isInteger(lineNum) || (lineNum as number) < 0) errors.push(`${label}: LineNum inválido`);
    out.LineNum = lineNum;
  }

  const baseEntry = num(l.baseEntry);
  const baseLine = num(l.baseLine);
  const hasBase = baseEntry !== null || baseLine !== null;
  if (hasBase) {
    if (!opts.allowBase) {
      errors.push(`${label}: no se permite documento base en este tipo de documento`);
    } else if (!Number.isInteger(baseEntry) || !Number.isInteger(baseLine) || (baseEntry as number) <= 0 || (baseLine as number) < 0) {
      errors.push(`${label}: BaseEntry / BaseLine inválidos`);
    } else {
      out.BaseType = BASE_TYPE_PURCHASE_ORDER;
      out.BaseEntry = baseEntry;
      out.BaseLine = baseLine;
    }
  }

  const itemCode = str(l.itemCode);
  if (!isExisting && !hasBase) {
    if (!itemCode) errors.push(`${label}: ItemCode es obligatorio`);
    else if (!CODE_RE.test(itemCode)) errors.push(`${label}: ItemCode contiene caracteres no válidos`);
    else out.ItemCode = itemCode;
  } else if (itemCode && !isExisting) {
    if (!CODE_RE.test(itemCode)) errors.push(`${label}: ItemCode contiene caracteres no válidos`);
    else out.ItemCode = itemCode;
  }

  const quantity = num(l.quantity);
  if (quantity === null) {
    if (!isExisting) errors.push(`${label}: Cantidad es obligatoria`);
  } else if (quantity <= 0) {
    errors.push(`${label}: la cantidad debe ser mayor que 0`);
  } else {
    out.Quantity = quantity;
  }

  const price = num(l.price);
  if (price !== null) {
    if (price < 0) errors.push(`${label}: el precio no puede ser negativo`);
    else out.UnitPrice = price;
  }

  const discount = num(l.discountPercent);
  if (discount !== null) {
    if (discount < 0 || discount > 100) errors.push(`${label}: el descuento debe estar entre 0 y 100`);
    else out.DiscountPercent = discount;
  }

  const whs = str(l.warehouseCode);
  if (whs) {
    if (!CODE_RE.test(whs) || whs.length > 8) errors.push(`${label}: código de almacén inválido`);
    else out.WarehouseCode = whs;
  }

  const taxCode = str(l.taxCode);
  if (taxCode) {
    if (!CODE_RE.test(taxCode) || taxCode.length > 8) errors.push(`${label}: código de impuesto inválido`);
    else out.TaxCode = taxCode;
  }

  return out;
}

function validateDate(v: unknown, field: string, errors: string[]): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!ISO_DATE.test(s) || Number.isNaN(Date.parse(s))) {
    errors.push(`${field}: fecha inválida (use AAAA-MM-DD)`);
    return undefined;
  }
  return s;
}

function validateText(v: unknown, field: string, max: number, errors: string[]): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') {
    errors.push(`${field}: debe ser texto`);
    return undefined;
  }
  if (v.length > max) {
    errors.push(`${field}: máximo ${max} caracteres`);
    return undefined;
  }
  return v;
}

/** Valida el cuerpo de creación y construye el payload del Service Layer */
export function buildCreatePayload(
  cfg: PurchaseDocConfig,
  body: unknown
): ValidationResult<{ payload: Record<string, unknown>; asDraft: boolean }> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Partial<PurchaseDocInput> & Record<string, unknown>;

  const cardCode = str(b.cardCode);
  if (!cardCode) errors.push('CardCode (proveedor) es obligatorio');
  else if (!CODE_RE.test(cardCode)) errors.push('CardCode contiene caracteres no válidos');

  const docDate = validateDate(b.docDate, 'DocDate', errors);
  const docDueDate = validateDate(b.docDueDate, 'DocDueDate', errors);
  const taxDate = validateDate(b.taxDate, 'TaxDate', errors);
  if (cfg.kind === 'purchase-orders' && !docDueDate) errors.push('DocDueDate (fecha de entrega) es obligatoria');
  if (docDate && docDueDate && docDueDate < docDate) errors.push('La fecha de entrega no puede ser anterior a la fecha del documento');

  const numAtCard = validateText(b.numAtCard, 'NumAtCard', 100, errors);
  const comments = validateText(b.comments, 'Comments', 254, errors);

  if (!Array.isArray(b.lines) || b.lines.length === 0) {
    errors.push('Debe incluir al menos una línea');
  } else if (b.lines.length > 500) {
    errors.push('Máximo 500 líneas por documento');
  }

  const lines = Array.isArray(b.lines)
    ? b.lines.map((l, i) =>
        validateLine(l, i, errors, { allowLineNum: false, allowBase: cfg.kind === 'goods-receipts' })
      )
    : [];

  if (errors.length > 0) return { ok: false, errors };

  const asDraft = b.asDraft === true;
  const payload: Record<string, unknown> = { CardCode: cardCode };
  if (asDraft) payload.DocObjectCode = cfg.draftObjectCode;
  if (docDate) payload.DocDate = docDate;
  if (docDueDate) payload.DocDueDate = docDueDate;
  if (taxDate) payload.TaxDate = taxDate;
  if (numAtCard) payload.NumAtCard = numAtCard;
  if (comments) payload.Comments = comments;
  payload.DocumentLines = lines.filter(Boolean);

  return { ok: true, errors: [], value: { payload, asDraft } };
}

/** Valida el cuerpo de actualización (PATCH) */
export function buildUpdatePayload(
  cfg: PurchaseDocConfig,
  source: PurchaseDocSource,
  body: unknown
): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;

  // En borradores se puede editar todo lo que se puede crear; en documentos solo lo permitido
  const allowedHeader = source === 'drafts' ? ['Comments', 'NumAtCard', 'DocDueDate', 'TaxDate', 'DocDate'] : cfg.updatableHeader;
  const allowLines = source === 'drafts' ? true : cfg.updatableLines;

  const payload: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    comments: 'Comments',
    numAtCard: 'NumAtCard',
    docDueDate: 'DocDueDate',
    taxDate: 'TaxDate',
    docDate: 'DocDate'
  };

  for (const [key, sapField] of Object.entries(fieldMap)) {
    if (!(key in b)) continue;
    if (!allowedHeader.includes(sapField as never)) {
      errors.push(`${sapField} no se puede modificar en este documento`);
      continue;
    }
    if (sapField === 'Comments') {
      const v = validateText(b[key], 'Comments', 254, errors);
      if (v !== undefined) payload.Comments = v;
    } else if (sapField === 'NumAtCard') {
      const v = validateText(b[key], 'NumAtCard', 100, errors);
      if (v !== undefined) payload.NumAtCard = v;
    } else {
      const v = validateDate(b[key], sapField, errors);
      if (v) payload[sapField] = v;
    }
  }

  if ('lines' in b) {
    if (!allowLines) {
      errors.push('Las líneas de este documento no se pueden modificar en SAP');
    } else if (!Array.isArray(b.lines)) {
      errors.push('lines debe ser una lista');
    } else if (b.lines.length > 0) {
      const lines = (b.lines as PurchaseLineInput[]).map((l, i) =>
        validateLine(l, i, errors, { allowLineNum: true, allowBase: false })
      );
      payload.DocumentLines = lines.filter(Boolean);
    }
  }

  // Campos desconocidos: rechazarlos explícitamente para evitar sorpresas
  const known = new Set([...Object.keys(fieldMap), 'lines']);
  for (const k of Object.keys(b)) {
    if (!known.has(k)) errors.push(`Campo no permitido: ${k}`);
  }

  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

export function validationErrorResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, error: errors.join(' • '), validationErrors: errors },
    { status: 400 }
  );
}

// ---------------------------------------------------------------------------
// Mapeos de lectura
// ---------------------------------------------------------------------------

export interface SapDocHeader {
  DocEntry: number;
  DocNum?: number;
  CardCode?: string;
  CardName?: string;
  NumAtCard?: string | null;
  DocDate?: string;
  DocDueDate?: string;
  TaxDate?: string;
  DocTotal?: number;
  VatSum?: number;
  DiscountPercent?: number;
  DocCurrency?: string;
  DocumentStatus?: string;
  Cancelled?: string;
  Comments?: string | null;
  JournalMemo?: string | null;
  FederalTaxID?: string;
  Address?: string;
  Address2?: string;
  DocumentsOwner?: number | null;
  SalesPersonCode?: number;
  PaymentGroupCode?: number;
  DocObjectCode?: string;
  DocumentLines?: SapDocLine[];
}

export interface SapDocLine {
  LineNum: number;
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  RemainingOpenQuantity?: number | null;
  OpenQuantity?: number | null;
  Price?: number;
  UnitPrice?: number;
  DiscountPercent?: number;
  LineTotal?: number;
  WarehouseCode?: string;
  TaxCode?: string;
  MeasureUnit?: string;
  UoMCode?: string;
  LineStatus?: string;
  ShipDate?: string;
  BaseType?: number;
  BaseEntry?: number | null;
  BaseLine?: number | null;
}

export const LIST_SELECT =
  'DocEntry,DocNum,CardCode,CardName,NumAtCard,DocDate,DocDueDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,Comments';

export function mapDocStatus(o: { DocumentStatus?: string; Cancelled?: string }): 'Abierto' | 'Cerrado' | 'Cancelado' {
  if (o.Cancelled === 'tYES') return 'Cancelado';
  return o.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto';
}

export function normalizeStatus(raw: string | null): 'Abierto' | 'Cerrado' | 'Cancelado' | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === 'abierto' || s === 'open') return 'Abierto';
  if (s === 'cerrado' || s === 'closed') return 'Cerrado';
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'Cancelado';
  return null;
}

const currencyLabel = (c?: string) => (c === '$' ? 'COP' : c || 'COP');
const day = (d?: string) => (d ? String(d).slice(0, 10) : '');

export function mapListRow(cfg: PurchaseDocConfig, source: PurchaseDocSource, o: SapDocHeader): DocumentRow {
  return {
    id: `${source === 'drafts' ? 'DRF' : cfg.idPrefix}-${o.DocEntry}`,
    docNum: String(o.DocNum || o.DocEntry),
    docType: cfg.docType,
    cardCode: o.CardCode || '',
    cardName: o.CardName || 'Proveedor sin nombre',
    docDate: day(o.DocDate),
    docDueDate: day(o.DocDueDate),
    docTotal: Number(o.DocTotal) || 0,
    currency: currencyLabel(o.DocCurrency),
    status: mapDocStatus(o),
    comments: o.Comments || '',
    numAtCard: o.NumAtCard || '',
    itemsCount: 1,
    items: []
  };
}

export function mapDetail(
  cfg: PurchaseDocConfig,
  source: PurchaseDocSource,
  o: SapDocHeader,
  buyerName: string
): PurchaseDocDetail {
  const status = mapDocStatus(o);
  const lines: PurchaseDocLine[] = Array.isArray(o.DocumentLines)
    ? o.DocumentLines.map((l) => {
        const quantity = Number(l.Quantity) || 0;
        const openQty =
          l.RemainingOpenQuantity !== undefined && l.RemainingOpenQuantity !== null
            ? Number(l.RemainingOpenQuantity) || 0
            : l.OpenQuantity !== undefined && l.OpenQuantity !== null
              ? Number(l.OpenQuantity) || 0
              : quantity;
        return {
          lineNum: l.LineNum,
          itemCode: l.ItemCode || '',
          description: l.ItemDescription || '',
          quantity,
          openQuantity: openQty,
          receivedQuantity: Math.max(0, quantity - openQty),
          price: Number(l.Price ?? l.UnitPrice) || 0,
          discountPercent: Number(l.DiscountPercent) || 0,
          lineTotal: Number(l.LineTotal) || 0,
          whsCode: l.WarehouseCode || '',
          taxCode: l.TaxCode || '',
          unitMsr: l.MeasureUnit || l.UoMCode || 'UN',
          lineStatus: l.LineStatus === 'bost_Close' ? 'Cerrada' : 'Abierta',
          shipDate: day(l.ShipDate),
          baseType: typeof l.BaseType === 'number' && l.BaseType >= 0 ? l.BaseType : null,
          baseEntry: l.BaseEntry ?? null,
          baseLine: l.BaseLine ?? null
        };
      })
    : [];

  const docTotal = Number(o.DocTotal) || 0;
  const vatSum = Number(o.VatSum) || 0;
  const isOpen = status === 'Abierto';
  const isDraft = source === 'drafts';

  return {
    kind: cfg.kind,
    source,
    docEntry: o.DocEntry,
    docNum: String(o.DocNum || o.DocEntry),
    cardCode: o.CardCode || '',
    cardName: o.CardName || '',
    numAtCard: o.NumAtCard || '',
    taxId: o.FederalTaxID || '—',
    address: o.Address || o.Address2 || '—',
    docDate: day(o.DocDate),
    docDueDate: day(o.DocDueDate),
    taxDate: day(o.TaxDate),
    currency: currencyLabel(o.DocCurrency),
    docTotal,
    vatSum,
    subtotal: docTotal - vatSum,
    discountPercent: Number(o.DiscountPercent) || 0,
    status,
    cancelled: o.Cancelled === 'tYES',
    comments: o.Comments || '',
    journalMemo: o.JournalMemo || '',
    buyerCode: typeof o.SalesPersonCode === 'number' && o.SalesPersonCode >= 0 ? o.SalesPersonCode : null,
    buyerName,
    paymentGroup: o.PaymentGroupCode ?? '—',
    totalQuantity: lines.reduce((acc, l) => acc + l.quantity, 0),
    totalOpenQuantity: lines.reduce((acc, l) => acc + l.openQuantity, 0),
    openLinesCount: lines.filter((l) => l.lineStatus === 'Abierta').length,
    lines,
    allowed: {
      update: isOpen,
      updateLines: isOpen && (isDraft || cfg.updatableLines),
      cancel: !isDraft && isOpen && cfg.actions.cancel,
      close: !isDraft && isOpen && cfg.actions.close,
      reopen: !isDraft && status === 'Cerrado' && cfg.actions.reopen,
      delete: isDraft,
      saveDraftToDocument: isDraft && isOpen
    },
    raw: o
  };
}

/** Busca un documento por DocEntry y, si no existe, por DocNum (solo lectura) */
export async function fetchDocByIdOrNum(entitySet: string, id: number, extraFilter?: string, byDocNum = false) {
  let result: { success: boolean; data?: SapDocHeader; error?: string } = byDocNum
    ? { success: false }
    : await querySapServiceLayer<SapDocHeader>(`${entitySet}(${id})`, { method: 'GET' });
  if (result.success && result.data && extraFilter && entitySet === 'Drafts') {
    // Asegurar que el borrador corresponde al tipo de documento solicitado
    const code = (result.data as SapDocHeader).DocObjectCode;
    if (code && !extraFilter.includes(`'${code}'`)) result = { success: false };
  }
  if (!result.success || !result.data) {
    const filter = `DocNum eq ${id}${extraFilter ? ` and ${extraFilter}` : ''}`;
    const byNum = await querySapServiceLayer<SapDocHeader[]>(entitySet, {
      method: 'GET',
      params: { '$filter': filter, '$top': '1' }
    });
    if (byNum.success && Array.isArray(byNum.data) && byNum.data.length > 0) {
      return { success: true as const, data: byNum.data[0] };
    }
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}
