import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { StockRow } from '@/types/inventory';

/**
 * GET /api/sap/inventory/stock   (solo lectura)
 *   Existencias por artículo y almacén desde Items + ItemWarehouseInfoCollection (OITW).
 *   Query: search (código o nombre), warehouse, page, limit (artículos por página, 10–100),
 *          withStock=1 (solo artículos con existencia total > 0), includeZero=1 (incluir almacenes en 0).
 *   El SL no permite filtrar por la colección de almacenes: el filtro de almacén se aplica sobre la
 *   página de artículos ya consultada.
 */

interface SapWhsInfo {
  WarehouseCode?: string;
  InStock?: number;
  Committed?: number;
  Ordered?: number;
  MinimalStock?: number;
  MaximalStock?: number;
  StandardAveragePrice?: number;
  Locked?: string;
}
interface SapItem {
  ItemCode: string;
  ItemName?: string;
  InventoryUOM?: string;
  ItemWarehouseInfoCollection?: SapWhsInfo[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(searchParams.get('limit') || '25', 10) || 25));
  const search = (searchParams.get('search') || '').trim().slice(0, 60).replace(/'/g, "''");
  const warehouse = (searchParams.get('warehouse') || '').trim();
  const withStock = searchParams.get('withStock') === '1';
  const includeZero = searchParams.get('includeZero') === '1';

  if (warehouse && !/^[A-Za-z0-9._\-]{1,8}$/.test(warehouse)) {
    return NextResponse.json({ success: false, error: 'Código de almacén inválido' }, { status: 400 });
  }

  const filter = [`InventoryItem eq 'tYES'`];
  if (withStock) filter.push('QuantityOnStock gt 0');
  if (search) filter.push(`(startswith(ItemCode, '${search}') or contains(ItemName, '${search}'))`);

  const result = await querySapServiceLayer<SapItem[]>('Items', {
    method: 'GET',
    pageSize: limit,
    params: {
      '$select': 'ItemCode,ItemName,InventoryUOM,ItemWarehouseInfoCollection',
      '$filter': filter.join(' and '),
      '$orderby': 'ItemCode',
      '$skip': String((page - 1) * limit)
    }
  });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json({ success: false, error: result.error || 'No se pudieron consultar las existencias', data: [] }, { status: 500 });
  }

  const rows: StockRow[] = [];
  for (const it of result.data) {
    for (const w of it.ItemWarehouseInfoCollection || []) {
      if (warehouse && w.WarehouseCode !== warehouse) continue;
      const inStock = Number(w.InStock) || 0;
      const committed = Number(w.Committed) || 0;
      const ordered = Number(w.Ordered) || 0;
      if (!includeZero && inStock === 0 && committed === 0 && ordered === 0) continue;
      rows.push({
        itemCode: it.ItemCode,
        itemName: it.ItemName || '',
        uom: it.InventoryUOM || '',
        warehouseCode: w.WarehouseCode || '',
        inStock,
        committed,
        ordered,
        available: inStock - committed + ordered,
        minStock: Number(w.MinimalStock) || 0,
        maxStock: Number(w.MaximalStock) || 0,
        avgPrice: Number(w.StandardAveragePrice) || 0,
        locked: w.Locked === 'tYES'
      });
    }
  }

  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    entity: 'Items/ItemWarehouseInfoCollection',
    page,
    limit,
    itemsInPage: result.data.length,
    count: rows.length,
    hasMore: Boolean(result.nextLink || result.data.length >= limit),
    data: rows,
    timestamp: new Date().toISOString()
  });
}
