import { ISO_DATE, ValidationResult } from '@/lib/purchasing';
import { InvNumberRow, InvNumberType } from '@/types/inventory';

/**
 * Números de serie (SerialNumberDetails, OSRN) y lotes (BatchNumberDetails, OBTN).
 * Según $metadata y el DI API (SerialNumberDetailsService / BatchNumberDetailsService: Get, GetList, Update)
 * solo admiten lectura y actualización de atributos: se crean al contabilizar documentos de stock y no se
 * pueden borrar.
 */

export const NUMBER_CONFIG: Record<InvNumberType, { entity: string; label: string; numberField: string; fields: Record<string, { sap: string; kind: 'text' | 'date' | 'enum'; max?: number; values?: string[] }> }> = {
  serials: {
    entity: 'SerialNumberDetails',
    label: 'Número de serie',
    numberField: 'SerialNumber',
    fields: {
      mfrSerialNo: { sap: 'MfrSerialNo', kind: 'text', max: 36 },
      lotNumber: { sap: 'LotNumber', kind: 'text', max: 36 },
      location: { sap: 'Location', kind: 'text', max: 100 },
      details: { sap: 'Details', kind: 'text', max: 254 },
      manufacturingDate: { sap: 'ManufacturingDate', kind: 'date' },
      expirationDate: { sap: 'ExpirationDate', kind: 'date' }
    }
  },
  batches: {
    entity: 'BatchNumberDetails',
    label: 'Lote',
    numberField: 'Batch',
    fields: {
      status: { sap: 'Status', kind: 'enum', values: ['bdsStatus_Released', 'bdsStatus_NotAccessible', 'bdsStatus_Locked'] },
      attribute1: { sap: 'BatchAttribute1', kind: 'text', max: 36 },
      attribute2: { sap: 'BatchAttribute2', kind: 'text', max: 36 },
      details: { sap: 'Details', kind: 'text', max: 254 },
      manufacturingDate: { sap: 'ManufacturingDate', kind: 'date' },
      expirationDate: { sap: 'ExpirationDate', kind: 'date' }
    }
  }
};

export function getNumberConfig(type: string) {
  return type === 'serials' || type === 'batches' ? { type: type as InvNumberType, ...NUMBER_CONFIG[type] } : null;
}

const BATCH_STATUS: Record<string, string> = {
  bdsStatus_Released: 'Liberado',
  bdsStatus_NotAccessible: 'No accesible',
  bdsStatus_Locked: 'Bloqueado'
};

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

export function mapNumberRow(type: InvNumberType, o: Record<string, unknown>): InvNumberRow {
  return {
    type,
    docEntry: Number(o.DocEntry),
    itemCode: s(o.ItemCode),
    itemDescription: s(o.ItemDescription),
    number: s(type === 'serials' ? o.SerialNumber : o.Batch),
    systemNumber: o.SystemNumber === null || o.SystemNumber === undefined ? null : Number(o.SystemNumber),
    status: type === 'batches' ? BATCH_STATUS[s(o.Status)] || s(o.Status) : '',
    mfrSerialNo: s(o.MfrSerialNo),
    lotNumber: s(o.LotNumber),
    attribute1: s(o.BatchAttribute1),
    attribute2: s(o.BatchAttribute2),
    location: s(o.Location),
    admissionDate: day(o.AdmissionDate),
    manufacturingDate: day(o.ManufacturingDate),
    expirationDate: day(o.ExpirationDate),
    details: s(o.Details),
    estadoMolde: s(o.U_EstadoMolde)
  };
}

export function buildNumberPatch(type: InvNumberType, body: unknown): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const fields = NUMBER_CONFIG[type].fields;
  const payload: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(body as Record<string, unknown>)) {
    const f = fields[k];
    if (!f) {
      errors.push(`Campo no permitido: ${k}`);
      continue;
    }
    if (f.kind === 'date') {
      const v = typeof raw === 'string' ? raw.trim() : '';
      if (v === '') payload[f.sap] = null;
      else if (!ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) errors.push(`${k}: fecha inválida (AAAA-MM-DD)`);
      else payload[f.sap] = v;
    } else if (f.kind === 'enum') {
      if (typeof raw !== 'string' || !f.values?.includes(raw)) errors.push(`${k}: valor no permitido`);
      else payload[f.sap] = raw;
    } else {
      if (raw !== null && typeof raw !== 'string') errors.push(`${k}: debe ser texto`);
      else if (raw && raw.length > (f.max ?? 254)) errors.push(`${k}: máximo ${f.max} caracteres`);
      else payload[f.sap] = raw ?? '';
    }
  }
  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  return errors.length ? { ok: false, errors } : { ok: true, errors: [], value: payload };
}
