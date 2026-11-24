import { querySapServiceLayer } from '@/lib/sapClient';
import { ValidationResult, ISO_DATE } from '@/lib/purchasing';
import { ITEM_CODE_RE, ITEM_FIELDS, ItemFieldDef, UDF_NAME_RE } from '@/lib/itemFields';
import { ItemDetail, ItemFieldValue, ItemRow, ItemWarehouseRow } from '@/types/items';

/**
 * Maestro de artículos (OITM) → entidad Items del Service Layer.
 *
 * Operaciones verificadas contra el $metadata (v1, 10.0) y la guía "Working with SAP Business One Service Layer":
 *  - GET /Items, GET /Items('código')                       (listado y detalle)
 *  - POST /Items                                            (crear; el artículo se identifica por ItemCode)
 *  - PATCH /Items('código')                                 (actualización diferencial)
 *  - PUT                                                     alias de PATCH (el PUT del SL resetea lo no enviado, §3.4.3)
 *  - DELETE /Items('código')                                (guía §5.2.4); SAP lo rechaza si el artículo tiene movimientos
 *  - Acción enlazable `Cancel` (ItemParams: SAPB1.Item): no se expone, ver cabecera de la ruta de acciones.
 */

export type SapRecord = Record<string, unknown>;

export const ITEM_LIST_SELECT = [
  'ItemCode',
  'ItemName',
  'ForeignName',
  'ItemsGroupCode',
  'BarCode',
  'InventoryItem',
  'SalesItem',
  'PurchaseItem',
  'Valid',
  'Frozen',
  'InventoryUOM',
  'DefaultWarehouse',
  'QuantityOnStock',
  'QuantityOrderedFromVendors',
  'QuantityOrderedByCustomers',
  'AvgStdPrice',
  'UpdateDate'
].join(',');

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const day = (v: unknown) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '');

/** Ruta del Service Layer de un artículo: Items('código') con comillas escapadas y URL-encode */
export function itemPath(code: string): string {
  return `Items('${encodeURIComponent(code.replace(/'/g, "''"))}')`;
}

export function parseItemCode(raw: string): string | null {
  let code: string;
  try {
    code = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (!code || code.length > 50 || /[\u0000-\u001f]/.test(code)) return null;
  return code;
}

export const esc = (v: string) => v.replace(/'/g, "''");

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export function mapItemStatus(o: SapRecord): 'Activo' | 'Inactivo' {
  return o.Frozen === 'tYES' || o.Valid === 'tNO' ? 'Inactivo' : 'Activo';
}

export function mapItemRow(o: SapRecord): ItemRow {
  const inStock = n(o.QuantityOnStock);
  const committed = n(o.QuantityOrderedByCustomers);
  const ordered = n(o.QuantityOrderedFromVendors);
  return {
    itemCode: s(o.ItemCode),
    itemName: s(o.ItemName),
    foreignName: s(o.ForeignName),
    groupCode: o.ItemsGroupCode === null || o.ItemsGroupCode === undefined ? null : n(o.ItemsGroupCode),
    barCode: s(o.BarCode),
    inventoryItem: o.InventoryItem === 'tYES',
    salesItem: o.SalesItem === 'tYES',
    purchaseItem: o.PurchaseItem === 'tYES',
    status: mapItemStatus(o),
    uom: s(o.InventoryUOM),
    defaultWarehouse: s(o.DefaultWarehouse),
    inStock,
    committed,
    ordered,
    available: inStock - committed + ordered,
    avgPrice: n(o.AvgStdPrice),
    updateDate: day(o.UpdateDate)
  };
}

function fieldValue(f: ItemFieldDef, raw: unknown): ItemFieldValue {
  switch (f.kind) {
    case 'yesno':
      return raw === 'tYES';
    case 'int':
    case 'number':
      return raw === null || raw === undefined || raw === '' ? '' : n(raw);
    case 'date':
      return day(raw);
    default:
      return s(raw);
  }
}

export function mapItemDetail(o: SapRecord, pricesAll = false): ItemDetail {
  const fields: Record<string, ItemFieldValue> = {};
  for (const f of ITEM_FIELDS) fields[f.key] = fieldValue(f, o[f.sap]);

  const udfs: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!UDF_NAME_RE.test(k)) continue;
    if (typeof v === 'number') udfs[k] = v;
    else if (typeof v === 'string') udfs[k] = /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v;
    else udfs[k] = '';
  }

  const whs: ItemWarehouseRow[] = (Array.isArray(o.ItemWarehouseInfoCollection) ? (o.ItemWarehouseInfoCollection as SapRecord[]) : []).map((w) => {
    const inStock = n(w.InStock);
    const committed = n(w.Committed);
    const ordered = n(w.Ordered);
    return {
      warehouseCode: s(w.WarehouseCode),
      inStock,
      committed,
      ordered,
      available: inStock - committed + ordered,
      minStock: n(w.MinimalStock),
      maxStock: n(w.MaximalStock),
      minOrder: n(w.MinimalOrder),
      avgPrice: n(w.StandardAveragePrice),
      locked: w.Locked === 'tYES'
    };
  });

  const allPrices = Array.isArray(o.ItemPrices) ? (o.ItemPrices as SapRecord[]) : [];
  const prices = allPrices
    .filter((p) => pricesAll || n(p.Price) !== 0)
    .map((p) => ({
      priceList: n(p.PriceList),
      price: n(p.Price),
      currency: s(p.Currency),
      basePriceList: n(p.BasePriceList),
      factor: n(p.Factor)
    }));

  const inStock = n(o.QuantityOnStock);
  const committed = n(o.QuantityOrderedByCustomers);
  const ordered = n(o.QuantityOrderedFromVendors);
  const status = mapItemStatus(o);

  return {
    itemCode: s(o.ItemCode),
    itemName: s(o.ItemName),
    status,
    fields,
    udfs,
    totals: { inStock, committed, ordered, available: inStock - committed + ordered },
    avgPrice: n(o.AvgStdPrice),
    movingAvgPrice: n(o.MovingAveragePrice),
    createDate: day(o.CreateDate),
    updateDate: day(o.UpdateDate),
    warehouses: whs,
    prices,
    pricesTotal: allPrices.length,
    barcodes: (Array.isArray(o.ItemBarCodeCollection) ? (o.ItemBarCodeCollection as SapRecord[]) : []).map((b) => ({
      barcode: s(b.Barcode),
      uomEntry: b.UoMEntry === null || b.UoMEntry === undefined ? null : n(b.UoMEntry),
      freeText: s(b.FreeText)
    })),
    vendors: (Array.isArray(o.ItemPreferredVendors) ? (o.ItemPreferredVendors as SapRecord[]) : []).map((v) => s(v.BPCode)).filter(Boolean),
    allowed: { update: true, freeze: status === 'Activo', unfreeze: status === 'Inactivo', delete: true }
  };
}

/** Lee un artículo completo (solo lectura) */
export async function fetchItem(code: string) {
  return querySapServiceLayer<SapRecord>(itemPath(code), { method: 'GET' });
}

/** Lee solo lo necesario para validar antes de escribir */
export async function fetchItemState(code: string) {
  const r = await querySapServiceLayer<SapRecord>(itemPath(code), {
    method: 'GET',
    params: { '$select': 'ItemCode,ItemName,Valid,Frozen,QuantityOnStock,QuantityOrderedFromVendors,QuantityOrderedByCustomers' }
  });
  if (!r.success || !r.data) return { success: false as const, notFound: /HTTP 404/.test(r.error || ''), error: r.error };
  return { success: true as const, data: r.data, status: mapItemStatus(r.data) };
}

// ---------------------------------------------------------------------------
// Validación y construcción de payloads
// ---------------------------------------------------------------------------

function toSapValue(f: ItemFieldDef, raw: unknown, mode: 'create' | 'update', errors: string[]): unknown {
  const label = f.label;
  switch (f.kind) {
    case 'yesno': {
      if (typeof raw !== 'boolean') {
        errors.push(`${label}: debe ser verdadero o falso`);
        return undefined;
      }
      return raw ? 'tYES' : 'tNO';
    }
    case 'enum': {
      if (raw === '') return undefined; // vacío = no enviar
      if (typeof raw !== 'string' || !f.options?.some((o) => o.value === raw)) {
        errors.push(`${label}: valor no permitido`);
        return undefined;
      }
      return raw;
    }
    case 'date': {
      const v = typeof raw === 'string' ? raw.trim() : '';
      if (v === '') return mode === 'update' ? null : undefined;
      if (!ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) {
        errors.push(`${label}: fecha inválida (AAAA-MM-DD)`);
        return undefined;
      }
      return v;
    }
    case 'int':
    case 'number': {
      if (raw === '' || raw === null || raw === undefined) {
        if (mode === 'update') errors.push(`${label}: no se puede dejar vacío`);
        return undefined;
      }
      const x = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
      if (!Number.isFinite(x)) {
        errors.push(`${label}: debe ser un número`);
        return undefined;
      }
      if (f.kind === 'int' && !Number.isInteger(x)) {
        errors.push(`${label}: debe ser un número entero`);
        return undefined;
      }
      if (x < 0 && !f.allowNegative) {
        errors.push(`${label}: no puede ser negativo`);
        return undefined;
      }
      return x;
    }
    default: {
      if (typeof raw !== 'string') {
        errors.push(`${label}: debe ser texto`);
        return undefined;
      }
      const v = raw.trim();
      if (f.max && v.length > f.max) {
        errors.push(`${label}: máximo ${f.max} caracteres`);
        return undefined;
      }
      if (v === '') {
        if (f.required) errors.push(`${label}: es obligatorio`);
        return mode === 'update' && !f.required ? '' : undefined;
      }
      return v;
    }
  }
}

function applyUdfs(raw: unknown, payload: SapRecord, errors: string[]) {
  if (raw === undefined) return;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('udf: debe ser un objeto { U_CAMPO: valor }');
    return;
  }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!UDF_NAME_RE.test(k)) {
      errors.push(`Campo de usuario no permitido: ${k}`);
      continue;
    }
    if (typeof v === 'number' && Number.isFinite(v)) payload[k] = v;
    else if (typeof v === 'string') payload[k] = v.trim().length > 254 ? (errors.push(`${k}: máximo 254 caracteres`), undefined) : v.trim();
    else errors.push(`${k}: debe ser texto o número`);
  }
}

function crossChecks(p: Record<string, unknown>, errors: string[], mode: 'create' | 'update') {
  const v = (k: string) => p[k];
  if (v('ValidFrom') && v('ValidTo') && String(v('ValidTo')) < String(v('ValidFrom'))) errors.push('Activo hasta no puede ser anterior a Activo desde');
  if (v('FrozenFrom') && v('FrozenTo') && String(v('FrozenTo')) < String(v('FrozenFrom'))) errors.push('Inactivo hasta no puede ser anterior a Inactivo desde');
  if (typeof v('MinInventory') === 'number' && typeof v('MaxInventory') === 'number' && (v('MinInventory') as number) > (v('MaxInventory') as number)) {
    errors.push('El stock mínimo no puede ser mayor que el máximo');
  }
  if (mode === 'create') {
    if (v('ManageSerialNumbers') === 'tYES' && v('ManageBatchNumbers') === 'tYES') errors.push('Un artículo se gestiona por series o por lotes, no por ambos');
    if ((v('ManageSerialNumbers') === 'tYES' || v('ManageBatchNumbers') === 'tYES') && v('InventoryItem') === 'tNO') {
      errors.push('Series y lotes solo aplican a artículos de inventario');
    }
    if (v('InventoryItem') === 'tYES' && v('ItemType') && v('ItemType') !== 'itItems') errors.push('Solo los artículos de tipo "Artículos" pueden ser de inventario');
  }
}

/** Construye el payload de creación (POST /Items) */
export function buildItemCreatePayload(body: unknown): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;

  const known = new Set<string>(['itemCode', 'udf', ...ITEM_FIELDS.map((f) => f.key)]);
  for (const k of Object.keys(b)) if (!known.has(k)) errors.push(`Campo no permitido: ${k}`);

  const payload: SapRecord = {};
  const code = typeof b.itemCode === 'string' ? b.itemCode.trim() : '';
  if (!code) errors.push('El código del artículo es obligatorio');
  else if (!ITEM_CODE_RE.test(code)) errors.push('Código de artículo inválido (máx. 50, solo letras, números, espacio y . _ - /)');
  else payload.ItemCode = code;

  for (const f of ITEM_FIELDS) {
    if (!(f.key in b)) {
      if (f.required) errors.push(`${f.label}: es obligatorio`);
      continue;
    }
    const v = toSapValue(f, b[f.key], 'create', errors);
    if (v !== undefined) payload[f.sap] = v;
  }
  applyUdfs(b.udf, payload, errors);
  crossChecks(payload, errors, 'create');

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

/** Construye el payload de actualización (PATCH /Items('código')): solo campos de la lista blanca */
export function buildItemUpdatePayload(body: unknown): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;
  const payload: SapRecord = {};

  if ('itemCode' in b) errors.push('El código del artículo no se puede modificar');
  const byKey = new Map(ITEM_FIELDS.map((f) => [f.key, f]));
  for (const [k, raw] of Object.entries(b)) {
    if (k === 'itemCode' || k === 'udf') continue;
    const f = byKey.get(k);
    if (!f) {
      errors.push(`Campo no permitido: ${k}`);
      continue;
    }
    if (f.createOnly) {
      errors.push(`${f.label}: solo se puede definir al crear el artículo (SAP lo bloquea cuando ya tiene movimientos)`);
      continue;
    }
    const v = toSapValue(f, raw, 'update', errors);
    if (v !== undefined) payload[f.sap] = v;
  }
  applyUdfs(b.udf, payload, errors);
  crossChecks(payload, errors, 'update');

  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

export interface ItemListFilters {
  search: string;
  group: string;
  inventory: string;
  sales: string;
  purchase: string;
  status: string;
  withStock: boolean;
}

const yn = (field: string, v: string) => (v === 'yes' ? `${field} eq 'tYES'` : v === 'no' ? `${field} eq 'tNO'` : null);

/** Filtro OData ($filter) de la lista de artículos; `extraCodes` = artículos hallados por código de barras adicional */
export function buildItemFilter(f: ItemListFilters, extraCodes: string[] = []): string {
  const parts: string[] = [];
  if (f.search) {
    const q = esc(f.search);
    const alts = [`startswith(ItemCode, '${q}')`, `contains(ItemName, '${q}')`, `contains(ForeignName, '${q}')`, `BarCode eq '${q}'`];
    for (const c of extraCodes) alts.push(`ItemCode eq '${esc(c)}'`);
    parts.push(`(${alts.join(' or ')})`);
  }
  if (/^-?\d+$/.test(f.group)) parts.push(`ItemsGroupCode eq ${f.group}`);
  for (const p of [yn('InventoryItem', f.inventory), yn('SalesItem', f.sales), yn('PurchaseItem', f.purchase)]) if (p) parts.push(p);
  if (f.status === 'active') parts.push(`Frozen eq 'tNO'`);
  if (f.status === 'inactive') parts.push(`Frozen eq 'tYES'`);
  if (f.withStock) parts.push('QuantityOnStock gt 0');
  return parts.join(' and ');
}
