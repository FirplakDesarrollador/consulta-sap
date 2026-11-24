import { LandedCostRow } from '@/types/sapBusiness';
import { ISO_DATE, ValidationResult } from '@/lib/purchasing';

/**
 * Precios de Entrega / Landed Costs (OIPF → EntitySet LandedCosts, EntityType SAPB1.LandedCost)
 *
 * Verificado en $metadata:
 *  - Acciones enlazables sobre SAPB1.LandedCost: CancelLandedCost, CloseLandedCost
 *  - No hay Reopen. DELETE no está soportado para este objeto (igual que los documentos de marketing).
 *  - Actualización por PATCH (el PUT de la API se enruta a PATCH).
 */

export interface SapLandedCost {
  DocEntry: number;
  LandedCostNumber?: number;
  PostingDate?: string;
  DueDate?: string;
  VendorCode?: string | null;
  VendorName?: string | null;
  Broker?: string | null;
  BrokerName?: string | null;
  ClosedDocument?: string;
  FileNumber?: string | null;
  Remarks?: string | null;
  Reference?: string | null;
  DocumentCurrency?: string;
  Total?: number;
  BeforeTax?: number;
  TotalFreightCharges?: number;
  BillofLadingNumber?: string | null;
  LandedCost_ItemLines?: Array<Record<string, unknown>>;
  LandedCost_CostLines?: Array<Record<string, unknown>>;
}

export const LC_LIST_SELECT =
  'DocEntry,LandedCostNumber,PostingDate,DueDate,VendorCode,VendorName,ClosedDocument,FileNumber,Remarks,Reference,DocumentCurrency,Total';

const day = (d?: string) => (d ? String(d).slice(0, 10) : '');

export function mapLandedCostRow(o: SapLandedCost): LandedCostRow {
  return {
    id: `LC-${o.DocEntry}`,
    docEntry: o.DocEntry,
    docNum: String(o.LandedCostNumber || o.DocEntry),
    postingDate: day(o.PostingDate),
    dueDate: day(o.DueDate),
    vendorCode: o.VendorCode || '',
    vendorName: o.VendorName || '',
    fileNumber: o.FileNumber || '',
    reference: o.Reference || '',
    remarks: o.Remarks || '',
    total: Number(o.Total) || 0,
    currency: o.DocumentCurrency === '$' ? 'COP' : o.DocumentCurrency || 'COP',
    status: o.ClosedDocument === 'lcClosed' ? 'Cerrado' : 'Abierto'
  };
}

const CODE_RE = /^[A-Za-z0-9._\-\/ ]{1,50}$/;
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const n = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};

function text(v: unknown, field: string, max: number, errors: string[]) {
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

function date(v: unknown, field: string, errors: string[]) {
  const x = s(v);
  if (!x) return undefined;
  if (!ISO_DATE.test(x)) {
    errors.push(`${field}: fecha inválida (AAAA-MM-DD)`);
    return undefined;
  }
  return x;
}

/**
 * Cuerpo de creación:
 * {
 *   postingDate?, dueDate?, vendorCode?, fileNumber?, reference?, remarks?,
 *   itemLines: [{ baseEntry, baseLine }]          // líneas de Entradas de Mercancía (OPDN)
 *   costLines: [{ landedCostCode, amount }]
 * }
 */
export function buildLandedCostCreatePayload(body: unknown): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;

  const payload: Record<string, unknown> = {};
  const postingDate = date(b.postingDate, 'PostingDate', errors);
  const dueDate = date(b.dueDate, 'DueDate', errors);
  if (postingDate) payload.PostingDate = postingDate;
  if (dueDate) payload.DueDate = dueDate;

  const vendor = s(b.vendorCode);
  if (vendor) {
    if (!CODE_RE.test(vendor)) errors.push('VendorCode contiene caracteres no válidos');
    else payload.VendorCode = vendor;
  }
  const fileNumber = text(b.fileNumber, 'FileNumber', 50, errors);
  if (fileNumber) payload.FileNumber = fileNumber;
  const reference = text(b.reference, 'Reference', 100, errors);
  if (reference) payload.Reference = reference;
  const remarks = text(b.remarks, 'Remarks', 254, errors);
  if (remarks) payload.Remarks = remarks;

  const itemLines = Array.isArray(b.itemLines) ? b.itemLines : [];
  if (itemLines.length === 0) errors.push('Debe incluir al menos una línea de artículo basada en una Entrada de Mercancía');
  payload.LandedCost_ItemLines = itemLines.map((raw, i) => {
    const l = (raw || {}) as Record<string, unknown>;
    const baseEntry = n(l.baseEntry);
    const baseLine = n(l.baseLine);
    if (!Number.isInteger(baseEntry) || (baseEntry as number) <= 0 || !Number.isInteger(baseLine) || (baseLine as number) < 0) {
      errors.push(`Línea de artículo ${i + 1}: BaseEntry / BaseLine inválidos`);
    }
    return { BaseDocumentType: 'asGoodsReceiptPO', BaseEntry: baseEntry, BaseLine: baseLine };
  });

  const costLines = Array.isArray(b.costLines) ? b.costLines : [];
  if (costLines.length === 0) errors.push('Debe incluir al menos un costo (LandedCostCode + importe)');
  payload.LandedCost_CostLines = costLines.map((raw, i) => {
    const l = (raw || {}) as Record<string, unknown>;
    const code = s(l.landedCostCode);
    const amount = n(l.amount);
    if (!code || !CODE_RE.test(code)) errors.push(`Costo ${i + 1}: código de gasto inválido`);
    if (amount === null || amount < 0) errors.push(`Costo ${i + 1}: importe inválido`);
    return { LandedCostCode: code, Amount: amount };
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

/** Campos de cabecera actualizables por PATCH en un precio de entrega abierto */
export function buildLandedCostUpdatePayload(body: unknown): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;
  const map: Record<string, [string, number]> = {
    remarks: ['Remarks', 254],
    reference: ['Reference', 100],
    fileNumber: ['FileNumber', 50],
    billOfLadingNumber: ['BillofLadingNumber', 50]
  };
  const payload: Record<string, unknown> = {};
  for (const k of Object.keys(b)) {
    if (k === 'dueDate') {
      const d = date(b.dueDate, 'DueDate', errors);
      if (d) payload.DueDate = d;
      continue;
    }
    const m = map[k];
    if (!m) {
      errors.push(`Campo no permitido: ${k}`);
      continue;
    }
    const v = text(b[k], m[0], m[1], errors);
    if (v !== undefined) payload[m[0]] = v;
  }
  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}
