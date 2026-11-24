import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildRecordCreate, buildTableFilter, fetchRecordState, mapHbtRecord, recordPath, rememberCount, selectColumns, SapRecord } from '@/lib/hbt';
import { methodNotAllowed, readOnlyReason, resolveTable, TableCtx } from '@/lib/hbtApi';

/**
 * /api/sap/hbt/tables/[table]   (tablas de usuario HBT_* / BPCO_* / HEIN_*  →  entidad U_<TABLA>)
 *
 * GET  → lista paginada. Query: page, limit (10–100), search (Code, Name y los 3 primeros campos de texto),
 *        prefix (Code empieza por…), order=asc|desc (por Code), f.<Campo>=<valor> (igualdad por campo de usuario).
 *        Los campos con credenciales no se piden a SAP.
 * POST → crea un registro { code, name?, fields:{ Campo: valor } } (solo tablas en modo crud/config). Verifica antes que
 *        el código no exista.
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

export async function GET(request: Request, ctx: TableCtx) {
  const { table: raw } = await ctx.params;
  const r = await resolveTable(raw);
  if ('error' in r) return r.error;
  const { table, defs } = r;

  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(sp.get('limit') || '50', 10) || 50));
  const search = (sp.get('search') || '').trim().slice(0, 60);
  const prefix = (sp.get('prefix') || '').trim().slice(0, 30);
  const order = sp.get('order') === 'desc' ? 'desc' : 'asc';
  const fieldFilters: Record<string, string> = {};
  for (const [k, v] of sp.entries()) if (k.startsWith('f.') && v.trim()) fieldFilters[k.slice(2)] = v.trim().slice(0, 100);

  const { filter, errors } = buildTableFilter(defs, { search, prefix, fieldFilters });
  if (errors.length > 0) return validationErrorResponse(errors);

  const params: Record<string, string> = {
    $select: ['Code', 'Name', ...selectColumns(defs, { memo: false })].join(','),
    $orderby: `Code ${order}`,
    $skip: String((page - 1) * limit),
    $inlinecount: 'allpages'
  };
  if (filter) params.$filter = filter;

  const result = await querySapServiceLayer<SapRecord[]>(table.entity, { method: 'GET', pageSize: limit, params });
  if (!result.success || !Array.isArray(result.data)) {
    return slErrorResponse(result.error, `No se pudo consultar la tabla ${table.name}`);
  }
  const data = result.data.map((rec) => mapHbtRecord(defs, rec));
  const total = typeof result.total === 'number' ? result.total : undefined;
  if (!filter && total !== undefined) rememberCount(table.entity, total);
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    entity: table.entity,
    table,
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

export async function POST(request: Request, ctx: TableCtx) {
  const { table: raw } = await ctx.params;
  const r = await resolveTable(raw);
  if ('error' in r) return r.error;
  const { table, defs } = r;
  if (table.mode !== 'crud' && table.mode !== 'config') {
    return methodNotAllowed(
      table,
      'Crear registros',
      table.mode === 'patch' ? 'es una tabla de series / configuración de una sola fila: solo se modifican registros existentes' : `${readOnlyReason(table.name)}`
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildRecordCreate(body, defs);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);
  const code = String(v.value.Code);

  // Solo lectura: el código no debe existir (también se verifica al simular)
  const exists = await fetchRecordState(table.entity, code);
  if (exists.success) {
    return NextResponse.json({ success: false, error: `Ya existe el registro ${code} en ${table.name}` }, { status: 409 });
  }
  if (!exists.notFound) return slErrorResponse(exists.error, 'No se pudo verificar si el código existe');

  const plan = { method: 'POST' as const, path: table.entity, body: v.value, description: `Crear registro ${code} en ${table.name}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite<SapRecord>(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo crear el registro en ${table.name}`);
  return NextResponse.json(
    { success: true, message: `Registro ${code} creado en ${table.name}`, data: { code, path: recordPath(table.entity, code) } },
    { status: 201 }
  );
}
