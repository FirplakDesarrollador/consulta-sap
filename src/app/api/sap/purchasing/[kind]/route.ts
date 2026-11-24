import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  ISO_DATE,
  LIST_SELECT,
  SapDocHeader,
  buildCreatePayload,
  executeWrite,
  getPurchaseConfig,
  guardWrite,
  mapDetail,
  mapListRow,
  normalizeStatus,
  parseSource,
  sapWritesEnabled,
  slErrorResponse,
  validationErrorResponse
} from '@/lib/purchasing';

/**
 * /api/sap/purchasing/[kind]
 *   kind = purchase-orders (OPOR → PurchaseOrders) | goods-receipts (OPDN → PurchaseDeliveryNotes)
 *
 * GET  → listado paginado (solo lectura).
 *        Query: page, limit (10–250), startDate, endDate, search, status (Abierto|Cerrado|Cancelado),
 *               source=documents|drafts (borradores ODRF del mismo tipo)
 * POST → crea el documento (POST /PurchaseOrders | /PurchaseDeliveryNotes) o un borrador (POST /Drafts)
 *        si asDraft=true. Acepta ?dryRun=1 para devolver la petición sin enviarla a SAP.
 *        Requiere SAP_ALLOW_WRITES=true para ejecutarse.
 */

type Ctx = { params: Promise<{ kind: string }> };

function unknownKind(kind: string) {
  return NextResponse.json(
    { success: false, error: `Tipo de documento de compra no soportado: ${kind}` },
    { status: 404 }
  );
}

export async function GET(request: Request, { params }: Ctx) {
  const { kind } = await params;
  const cfg = getPurchaseConfig(kind);
  if (!cfg) return unknownKind(kind);

  const { searchParams } = new URL(request.url);
  const source = parseSource(searchParams.get('source'));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const skip = (page - 1) * limit;

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim();
  const status = normalizeStatus(searchParams.get('status'));

  const filterParts: string[] = [];
  if (source === 'drafts') filterParts.push(`DocObjectCode eq '${cfg.draftObjectCode}'`);
  if (startDate && ISO_DATE.test(startDate)) filterParts.push(`DocDate ge '${startDate}'`);
  if (endDate && ISO_DATE.test(endDate)) filterParts.push(`DocDate le '${endDate}'`);

  if (status === 'Abierto') filterParts.push(`DocumentStatus eq 'bost_Open' and Cancelled eq 'tNO'`);
  else if (status === 'Cerrado') filterParts.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tNO'`);
  else if (status === 'Cancelado') filterParts.push(`Cancelled eq 'tYES'`);

  if (search) {
    const sanitized = search.replace(/'/g, "''");
    const textFilter = `contains(CardName, '${sanitized}') or contains(CardCode, '${sanitized}') or contains(NumAtCard, '${sanitized}')`;
    filterParts.push(/^\d+$/.test(search) ? `(DocNum eq ${search} or ${textFilter})` : `(${textFilter})`);
  }

  const query: Record<string, string> = {
    '$skip': String(skip),
    '$orderby': 'DocEntry desc',
    '$select': LIST_SELECT
  };
  if (filterParts.length > 0) query['$filter'] = filterParts.join(' and ');

  const entitySet = source === 'drafts' ? 'Drafts' : cfg.entity;
  const result = await querySapServiceLayer<SapDocHeader[]>(entitySet, { method: 'GET', pageSize: limit, params: query });

  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || `No se pudieron obtener los documentos (${cfg.table}) de SAP`,
        data: [],
        page,
        limit,
        hasMore: false
      },
      { status: 500 }
    );
  }

  const data = result.data.map((o) => mapListRow(cfg, source, o));

  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    entity: entitySet,
    docSource: source,
    writesEnabled: sapWritesEnabled(),
    page,
    limit,
    count: data.length,
    hasMore: Boolean(result.nextLink || data.length >= limit),
    data,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const { kind } = await params;
  const cfg = getPurchaseConfig(kind);
  if (!cfg) return unknownKind(kind);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }

  const v = buildCreatePayload(cfg, body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const { payload, asDraft } = v.value;
  const plan = {
    method: 'POST' as const,
    path: asDraft ? 'Drafts' : cfg.entity,
    body: payload,
    description: asDraft ? `Crear borrador de ${cfg.label}` : `Crear ${cfg.label}`
  };

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite<SapDocHeader>(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo crear ${cfg.label} en SAP`);

  const created = result.data as SapDocHeader | undefined;
  return NextResponse.json(
    {
      success: true,
      message: `${asDraft ? 'Borrador de ' : ''}${cfg.label} creado en SAP${created?.DocNum ? ` con número ${created.DocNum}` : ''}`,
      data: created ? mapDetail(cfg, asDraft ? 'drafts' : 'documents', created, '') : null
    },
    { status: 201 }
  );
}
