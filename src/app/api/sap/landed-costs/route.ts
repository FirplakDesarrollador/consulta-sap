import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { ISO_DATE, executeWrite, guardWrite, sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { LC_LIST_SELECT, SapLandedCost, buildLandedCostCreatePayload, mapLandedCostRow } from '@/lib/landedCosts';

/**
 * /api/sap/landed-costs  (Precios de Entrega, OIPF → LandedCosts)
 * GET  → listado paginado. Query: page, limit, startDate, endDate (PostingDate), search, status (Abierto|Cerrado)
 * POST → crea un precio de entrega basado en líneas de Entradas de Mercancía. ?dryRun=1 disponible;
 *        requiere SAP_ALLOW_WRITES=true.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim();
  const status = (searchParams.get('status') || '').toLowerCase();

  const f: string[] = [];
  if (startDate && ISO_DATE.test(startDate)) f.push(`PostingDate ge '${startDate}'`);
  if (endDate && ISO_DATE.test(endDate)) f.push(`PostingDate le '${endDate}'`);
  if (status === 'abierto' || status === 'open') f.push(`ClosedDocument eq 'lcOpen'`);
  if (status === 'cerrado' || status === 'closed') f.push(`ClosedDocument eq 'lcClosed'`);
  if (search) {
    const q = search.replace(/'/g, "''");
    const txt = `contains(VendorName, '${q}') or contains(VendorCode, '${q}') or contains(FileNumber, '${q}') or contains(Reference, '${q}')`;
    f.push(/^\d+$/.test(search) ? `(LandedCostNumber eq ${search} or ${txt})` : `(${txt})`);
  }

  const query: Record<string, string> = {
    '$skip': String((page - 1) * limit),
    '$orderby': 'DocEntry desc',
    '$select': LC_LIST_SELECT
  };
  if (f.length) query['$filter'] = f.join(' and ');

  const result = await querySapServiceLayer<SapLandedCost[]>('LandedCosts', { method: 'GET', pageSize: limit, params: query });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      { success: false, error: result.error || 'No se pudieron obtener los precios de entrega', data: [], hasMore: false },
      { status: 500 }
    );
  }
  const data = result.data.map(mapLandedCostRow);
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    writesEnabled: sapWritesEnabled(),
    page,
    limit,
    count: data.length,
    hasMore: Boolean(result.nextLink || data.length >= limit),
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
  const v = buildLandedCostCreatePayload(body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'POST' as const, path: 'LandedCosts', body: v.value, description: 'Crear Precio de Entrega' };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite<SapLandedCost>(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo crear el precio de entrega en SAP');
  const created = result.data as SapLandedCost | undefined;
  return NextResponse.json(
    {
      success: true,
      message: `Precio de entrega creado en SAP${created?.LandedCostNumber ? ` con número ${created.LandedCostNumber}` : ''}`,
      data: created ? mapLandedCostRow(created) : null
    },
    { status: 201 }
  );
}
