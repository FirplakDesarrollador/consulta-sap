import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  ISO_DATE,
  executeWrite,
  guardWrite,
  normalizeStatus,
  sapWritesEnabled,
  slErrorResponse,
  validationErrorResponse
} from '@/lib/purchasing';
import {
  SapRecord,
  buildInvCreatePayload,
  draftFilter,
  entitySetFor,
  getInvConfig,
  mapInvDetail,
  mapInvRow,
  parseInvSource,
  statusFilter
} from '@/lib/inventory';

/**
 * /api/sap/inventory/[kind]
 *   kind = goods-entries (OIGN) | goods-exits (OIGE) | transfers (OWTR) | transfer-requests (OWTQ)
 *        | countings (OINC) | postings (OIQR)
 *
 * GET  → listado paginado (solo lectura). Query: page, limit (10–250), startDate, endDate, search,
 *        status (Abierto|Cerrado|Cancelado), warehouse (traslados/solicitudes), source=documents|drafts.
 * POST → crea el documento o, con asDraft=true, el borrador (Drafts / StockTransferDrafts).
 *        Acepta ?dryRun=1 (no envía nada a SAP). Requiere SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ kind: string }> };

const unknownKind = (kind: string) =>
  NextResponse.json({ success: false, error: `Tipo de documento de inventario no soportado: ${kind}` }, { status: 404 });

export async function GET(request: Request, { params }: Ctx) {
  const { kind } = await params;
  const cfg = getInvConfig(kind);
  if (!cfg) return unknownKind(kind);

  const { searchParams } = new URL(request.url);
  const source = parseInvSource(cfg, searchParams.get('source'));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const skip = (page - 1) * limit;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim().slice(0, 60);
  const warehouse = searchParams.get('warehouse')?.trim();
  const status = normalizeStatus(searchParams.get('status'));

  const isDraft = source === 'drafts';
  const dateField = isDraft ? 'DocDate' : cfg.dateField;
  const numField = isDraft ? 'DocNum' : cfg.numField;
  const keyField = isDraft ? 'DocEntry' : cfg.keyField;

  const filter: string[] = [];
  if (isDraft) filter.push(draftFilter(cfg) as string);
  if (startDate && ISO_DATE.test(startDate)) filter.push(`${dateField} ge '${startDate}'`);
  if (endDate && ISO_DATE.test(endDate)) filter.push(`${dateField} le '${endDate}'`);
  const sf = statusFilter(cfg, source, status);
  if (sf) filter.push(sf);
  if (warehouse && /^[A-Za-z0-9._\-]{1,8}$/.test(warehouse) && cfg.lineMode === 'transfer') {
    filter.push(`(FromWarehouse eq '${warehouse}' or ToWarehouse eq '${warehouse}')`);
  }
  if (search) {
    const q = search.replace(/'/g, "''");
    const fields = isDraft ? ['Comments', 'Reference2'] : cfg.textSearchFields;
    const text = fields.map((f) => `contains(${f}, '${q}')`).join(' or ');
    filter.push(/^\d+$/.test(search) ? `(${numField} eq ${search} or ${text})` : `(${text})`);
  }

  const select = isDraft
    ? cfg.drafts?.entity === 'Drafts'
      ? 'DocEntry,DocNum,DocDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,Comments,Reference2,JournalMemo,DocObjectCode'
      : 'DocEntry,DocNum,DocDate,DueDate,CardName,FromWarehouse,ToWarehouse,DocumentStatus,Comments,Reference2,JournalMemo,DocObjectCode'
    : cfg.listSelect;

  const query: Record<string, string> = { '$skip': String(skip), '$orderby': `${keyField} desc`, '$select': select };
  if (filter.length) query['$filter'] = filter.join(' and ');

  const entitySet = entitySetFor(cfg, source);
  const result = await querySapServiceLayer<SapRecord[]>(entitySet, { method: 'GET', pageSize: limit, params: query });
  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      { success: false, error: result.error || `No se pudieron obtener los documentos (${cfg.table}) de SAP`, data: [], page, limit, hasMore: false },
      { status: 500 }
    );
  }

  const data = result.data.map((o) => mapInvRow(cfg, source, o));
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
  const cfg = getInvConfig(kind);
  if (!cfg) return unknownKind(kind);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }

  const v = buildInvCreatePayload(cfg, body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);
  const { payload, asDraft } = v.value;

  const plan = {
    method: 'POST' as const,
    path: entitySetFor(cfg, asDraft ? 'drafts' : 'documents'),
    body: payload,
    description: asDraft ? `Crear borrador de ${cfg.label}` : `Crear ${cfg.label}`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite<SapRecord>(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo crear ${cfg.label} en SAP`);

  const created = result.data as SapRecord | undefined;
  const detail = created ? mapInvDetail(cfg, asDraft ? 'drafts' : 'documents', created) : null;
  return NextResponse.json(
    {
      success: true,
      message: `${asDraft ? 'Borrador de ' : ''}${cfg.label} creado en SAP${detail?.docNum ? ` con número ${detail.docNum}` : ''}`,
      data: detail
    },
    { status: 201 }
  );
}
