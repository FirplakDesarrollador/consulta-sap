import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildItemCreatePayload, buildItemFilter, esc, fetchItemState, ITEM_LIST_SELECT, itemPath, mapItemRow, SapRecord } from '@/lib/items';

/**
 * /api/sap/items   (Maestro de artículos, entidad Items / tabla OITM)
 *
 * GET  → lista paginada. Query: page, limit (10–100), search (código, descripción, descripción extranjera,
 *        código de barras principal o adicional), group, inventory|sales|purchase = yes|no,
 *        status = active|inactive, withStock=1.
 * POST → crea un artículo (campos de la lista blanca de itemFields.ts + udf). Verifica antes que el código no exista.
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(sp.get('limit') || '50', 10) || 50));
  const search = (sp.get('search') || '').trim().slice(0, 60);

  // Códigos de barras adicionales (entidad BarCodes): el SL no permite filtrar Items por la colección
  let extraCodes: string[] = [];
  if (search && search.length >= 4 && !/\s/.test(search)) {
    const bc = await querySapServiceLayer<SapRecord[]>('BarCodes', {
      method: 'GET',
      pageSize: 20,
      params: { '$filter': `Barcode eq '${esc(search)}'`, '$select': 'ItemNo', '$top': '20' }
    });
    if (bc.success && Array.isArray(bc.data)) extraCodes = bc.data.map((r) => String(r.ItemNo)).filter(Boolean);
  }

  const filter = buildItemFilter(
    {
      search,
      group: sp.get('group') || '',
      inventory: sp.get('inventory') || '',
      sales: sp.get('sales') || '',
      purchase: sp.get('purchase') || '',
      status: sp.get('status') || '',
      withStock: sp.get('withStock') === '1'
    },
    extraCodes
  );

  const params: Record<string, string> = {
    '$select': ITEM_LIST_SELECT,
    '$orderby': 'ItemCode',
    '$skip': String((page - 1) * limit),
    '$inlinecount': 'allpages'
  };
  if (filter) params['$filter'] = filter;

  const result = await querySapServiceLayer<SapRecord[]>('Items', { method: 'GET', pageSize: limit, params });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      { success: false, error: result.error || 'No se pudieron obtener los artículos de SAP', data: [], page, limit, hasMore: false },
      { status: 500 }
    );
  }
  const data = result.data.map(mapItemRow);
  const total = typeof result.total === 'number' ? result.total : undefined;
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    entity: 'Items',
    writesEnabled: sapWritesEnabled(),
    page,
    limit,
    count: data.length,
    total,
    hasMore: Boolean(result.nextLink) || (total !== undefined ? page * limit < total : data.length >= limit),
    data,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildItemCreatePayload(body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);
  const code = String(v.value.ItemCode);

  // Solo lectura: el código no debe existir (también se verifica al simular)
  const exists = await fetchItemState(code);
  if (exists.success) {
    return NextResponse.json({ success: false, error: `Ya existe un artículo con el código ${code}` }, { status: 409 });
  }
  if (!exists.notFound) return slErrorResponse(exists.error, 'No se pudo verificar si el código existe');

  const plan = { method: 'POST' as const, path: 'Items', body: v.value, description: `Crear artículo ${code}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite<SapRecord>(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo crear el artículo en SAP');
  return NextResponse.json({ success: true, message: `Artículo ${code} creado en SAP`, data: { itemCode: code, path: itemPath(code) } }, { status: 201 });
}
