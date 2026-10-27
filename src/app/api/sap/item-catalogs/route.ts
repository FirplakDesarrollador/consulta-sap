import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { ItemCatalogs, ItemUdfDef } from '@/types/items';

/**
 * GET /api/sap/item-catalogs   (solo lectura; cacheado 5 min en memoria)
 * Catálogos para el maestro de artículos: grupos de artículos, fabricantes, grupos de UdM, almacenes,
 * listas de precios y definición de los campos de usuario de OITM (UserFieldsMD, con obligatorios y valores válidos).
 */

type Rec = Record<string, unknown>;
let cache: { at: number; data: ItemCatalogs } | null = null;
const TTL = 5 * 60 * 1000;

const list = async (entity: string, select: string, order?: string) => {
  const r = await querySapServiceLayer<Rec[]>(entity, {
    method: 'GET',
    pageSize: 500,
    params: { '$select': select, ...(order ? { '$orderby': order } : {}) }
  });
  return r.success && Array.isArray(r.data) ? r.data : null;
};

const udfKind = (type: unknown): ItemUdfDef['kind'] => (type === 'db_Float' || type === 'db_Numeric' ? 'number' : type === 'db_Date' ? 'date' : 'text');

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json({ success: true, data: cache.data, cached: true });

  const [groups, makers, uomGroups, whs, priceLists, udfRaw] = await Promise.all([
    list('ItemGroups', 'Number,GroupName', 'GroupName'),
    list('Manufacturers', 'Code,ManufacturerName', 'ManufacturerName'),
    list('UnitOfMeasurementGroups', 'AbsEntry,Code,Name'),
    list('Warehouses', 'WarehouseCode,WarehouseName,Inactive', 'WarehouseCode'),
    list('PriceLists', 'PriceListNo,PriceListName', 'PriceListNo'),
    (async () => {
      const r = await querySapServiceLayer<Rec[]>('UserFieldsMD', {
        method: 'GET',
        pageSize: 200,
        params: {
          '$filter': `TableName eq 'OITM'`,
          '$select': 'Name,Description,Type,Size,Mandatory,DefaultValue,ValidValuesMD',
          '$orderby': 'FieldID'
        }
      });
      return r.success && Array.isArray(r.data) ? r.data : null;
    })()
  ]);

  const warnings: string[] = [];
  if (!groups) warnings.push('grupos de artículos');
  if (!makers) warnings.push('fabricantes');
  if (!uomGroups) warnings.push('grupos de UdM');
  if (!whs) warnings.push('almacenes');
  if (!priceLists) warnings.push('listas de precios');
  if (!udfRaw) warnings.push('campos de usuario');

  const data: ItemCatalogs = {
    itemGroups: (groups || []).map((g) => ({ code: Number(g.Number), name: String(g.GroupName ?? '') })),
    manufacturers: (makers || []).map((m) => ({ code: Number(m.Code), name: String(m.ManufacturerName ?? '') })),
    uomGroups: (uomGroups || []).map((u) => ({ code: Number(u.AbsEntry), name: String(u.Name || u.Code || '') })),
    warehouses: (whs || []).filter((w) => w.Inactive !== 'tYES').map((w) => ({ code: String(w.WarehouseCode), name: String(w.WarehouseName ?? '') })),
    priceLists: (priceLists || []).map((p) => ({ code: Number(p.PriceListNo), name: String(p.PriceListName ?? '') })),
    udfs: (udfRaw || []).map((u) => ({
      name: `U_${u.Name}`,
      label: String(u.Description || u.Name),
      kind: udfKind(u.Type),
      size: typeof u.Size === 'number' ? u.Size : undefined,
      mandatory: u.Mandatory === 'tYES',
      defaultValue: u.DefaultValue ? String(u.DefaultValue) : undefined,
      validValues: Array.isArray(u.ValidValuesMD) && u.ValidValuesMD.length > 0
        ? (u.ValidValuesMD as Rec[]).map((v) => ({ value: String(v.Value), label: String(v.Description || v.Value) }))
        : undefined
    }))
  };

  if (warnings.length === 0) cache = { at: Date.now(), data };
  return NextResponse.json({ success: true, data, warnings });
}
