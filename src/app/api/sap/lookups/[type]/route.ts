import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { LookupOption } from '@/types/sapBusiness';

/**
 * GET /api/sap/lookups/[type]?search=...   (solo lectura, máx. 20 resultados)
 *   suppliers          → BusinessPartners con CardType = cSupplier
 *   items              → Items (indica si es artículo de compra)
 *   warehouses         → Warehouses activos
 *   landed-cost-codes  → LandedCostsCodes
 */

type Ctx = { params: Promise<{ type: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('search') || '').trim().slice(0, 60);
  const q = raw.replace(/'/g, "''");
  const top = '20';

  let entity: string;
  const query: Record<string, string> = { '$top': top };
  let map: (r: Record<string, unknown>) => LookupOption;

  switch (type) {
    case 'suppliers': {
      entity = 'BusinessPartners';
      const f = [`CardType eq 'cSupplier'`];
      if (q) f.push(`(startswith(CardCode, '${q}') or contains(CardName, '${q}') or contains(FederalTaxID, '${q}'))`);
      query['$filter'] = f.join(' and ');
      query['$select'] = 'CardCode,CardName,FederalTaxID,Currency,Frozen';
      query['$orderby'] = 'CardName';
      map = (r) => ({
        code: String(r.CardCode),
        name: String(r.CardName || ''),
        extra: [r.FederalTaxID ? `NIT ${r.FederalTaxID}` : '', r.Frozen === 'tYES' ? 'INACTIVO' : ''].filter(Boolean).join(' • ')
      });
      break;
    }
    case 'items': {
      entity = 'Items';
      if (q) query['$filter'] = `startswith(ItemCode, '${q}') or contains(ItemName, '${q}')`;
      query['$select'] = 'ItemCode,ItemName,PurchaseItem,PurchaseUnit,DefaultWarehouse,Frozen';
      map = (r) => ({
        code: String(r.ItemCode),
        name: String(r.ItemName || ''),
        extra: [
          r.PurchaseUnit ? String(r.PurchaseUnit) : '',
          r.DefaultWarehouse ? `Alm. ${r.DefaultWarehouse}` : '',
          r.PurchaseItem === 'tNO' ? 'NO ES DE COMPRA' : '',
          r.Frozen === 'tYES' ? 'INACTIVO' : ''
        ]
          .filter(Boolean)
          .join(' • ')
      });
      break;
    }
    case 'warehouses': {
      entity = 'Warehouses';
      const f = [`Inactive eq 'tNO'`];
      if (q) f.push(`(startswith(WarehouseCode, '${q}') or contains(WarehouseName, '${q}'))`);
      query['$filter'] = f.join(' and ');
      query['$select'] = 'WarehouseCode,WarehouseName';
      query['$top'] = '100';
      map = (r) => ({ code: String(r.WarehouseCode), name: String(r.WarehouseName || '') });
      break;
    }
    case 'landed-cost-codes': {
      entity = 'LandedCostsCodes';
      if (q) query['$filter'] = `startswith(Code, '${q}') or contains(Name, '${q}')`;
      query['$select'] = 'Code,Name,AllocationBy';
      query['$top'] = '100';
      map = (r) => ({ code: String(r.Code), name: String(r.Name || ''), extra: String(r.AllocationBy || '') });
      break;
    }
    default:
      return NextResponse.json({ success: false, error: `Lookup desconocido: ${type}` }, { status: 404 });
  }

  const result = await querySapServiceLayer<Record<string, unknown>[]>(entity, {
    method: 'GET',
    pageSize: Number(query['$top']),
    params: query
  });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json({ success: false, error: result.error || 'Error consultando SAP', data: [] }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: result.data.map(map) });
}
