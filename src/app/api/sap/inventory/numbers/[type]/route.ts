import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { sapWritesEnabled } from '@/lib/purchasing';
import { getNumberConfig, mapNumberRow } from '@/lib/inventoryNumbers';

/**
 * /api/sap/inventory/numbers/[type]   type = serials (SerialNumberDetails) | batches (BatchNumberDetails)
 * GET  → listado paginado. Query: search (artículo o número), page, limit.
 * POST → 405: series y lotes se crean al contabilizar documentos de inventario, no directamente.
 */

type Ctx = { params: Promise<{ type: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { type } = await params;
  const cfg = getNumberConfig(type);
  if (!cfg) return NextResponse.json({ success: false, error: `Tipo no soportado: ${type}` }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const search = (searchParams.get('search') || '').trim().slice(0, 60).replace(/'/g, "''");

  const query: Record<string, string> = { '$orderby': 'DocEntry desc', '$skip': String((page - 1) * limit) };
  if (search) query['$filter'] = `startswith(ItemCode, '${search}') or contains(${cfg.numberField}, '${search}') or contains(ItemDescription, '${search}')`;

  const result = await querySapServiceLayer<Record<string, unknown>[]>(cfg.entity, { method: 'GET', pageSize: limit, params: query });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json({ success: false, error: result.error || `No se pudo consultar ${cfg.entity}`, data: [] }, { status: 500 });
  }
  const data = result.data.map((o) => mapNumberRow(cfg.type, o));
  return NextResponse.json({
    success: true,
    entity: cfg.entity,
    writesEnabled: sapWritesEnabled(),
    page,
    limit,
    count: data.length,
    hasMore: Boolean(result.nextLink || data.length >= limit),
    data
  });
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'SAP Service Layer no permite crear series/lotes directamente: se generan al contabilizar documentos de inventario.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
