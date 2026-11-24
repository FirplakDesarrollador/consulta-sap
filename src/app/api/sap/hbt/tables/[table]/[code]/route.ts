import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildRecordUpdate, fetchRecordState, mapHbtRecord, parseHbtCode, recordPath, selectColumns, SapRecord } from '@/lib/hbt';
import { methodNotAllowed, readOnlyReason, RecordCtx, resolveTable } from '@/lib/hbtApi';

/**
 * /api/sap/hbt/tables/[table]/[code]
 *
 * GET    → detalle del registro (incluye campos memo). Los campos con credenciales no se piden y se informan en hiddenFields.
 * PATCH  → actualización diferencial { name?, fields:{ Campo: valor } } (tablas crud / config / patch). El Code no se modifica.
 * PUT    → alias de PATCH (el PUT del SL resetea las propiedades omitidas, guía §3.4.3).
 * DELETE → elimina el registro (solo tablas crud / config). Exige ?confirm=<código> idéntico (la simulación ?dryRun=1 no lo exige).
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

async function resolve(ctx: RecordCtx) {
  const { table: rawTable, code: rawCode } = await ctx.params;
  const r = await resolveTable(rawTable);
  if ('error' in r) return { error: r.error };
  const code = parseHbtCode(rawCode);
  if (!code) return { error: NextResponse.json({ success: false, error: `Código inválido: ${rawCode}` }, { status: 400 }) };
  return { ...r, code };
}

function notFound(table: string, code: string, error?: string) {
  if (error && !/HTTP 404/.test(error)) return slErrorResponse(error, `No se pudo consultar el registro ${code}`);
  return NextResponse.json({ success: false, error: `No se encontró el registro ${code} en ${table}` }, { status: 404 });
}

export async function GET(_request: Request, ctx: RecordCtx) {
  const r = await resolve(ctx);
  if ('error' in r) return r.error;
  const { table, defs, code } = r;
  const res = await querySapServiceLayer<SapRecord>(recordPath(table.entity, code), {
    method: 'GET',
    params: { $select: ['Code', 'Name', ...selectColumns(defs, { memo: true })].join(',') }
  });
  if (!res.success || !res.data) return notFound(table.name, code, res.error);
  return NextResponse.json({ success: true, table, data: mapHbtRecord(defs, res.data), timestamp: new Date().toISOString() });
}

export async function PATCH(request: Request, ctx: RecordCtx) {
  const r = await resolve(ctx);
  if ('error' in r) return r.error;
  const { table, defs, code } = r;
  if (table.mode === 'readonly') return methodNotAllowed(table, 'Modificar registros', readOnlyReason(table.name));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildRecordUpdate(body, defs);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: recordPath(table.entity, code), body: v.value, description: `Actualizar registro ${code} de ${table.name}` };
  const st = await fetchRecordState(table.entity, code);
  if (!st.success) return notFound(table.name, code, st.error);

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar el registro en ${table.name}`);
  return NextResponse.json({ success: true, message: `Registro ${code} de ${table.name} actualizado en SAP` });
}

/** PUT enrutado a PATCH (ver cabecera) */
export const PUT = PATCH;

export async function DELETE(request: Request, ctx: RecordCtx) {
  const r = await resolve(ctx);
  if ('error' in r) return r.error;
  const { table, code } = r;
  if (table.mode !== 'crud' && table.mode !== 'config') {
    return methodNotAllowed(
      table,
      'Eliminar registros',
      table.mode === 'patch' ? 'las series y la configuración de una fila no se eliminan desde esta aplicación' : readOnlyReason(table.name)
    );
  }
  const url = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes((url.searchParams.get('dryRun') || '').toLowerCase());
  if (!dryRun && url.searchParams.get('confirm') !== code) {
    return NextResponse.json({ success: false, error: 'Confirmación requerida: envíe ?confirm=<código del registro> idéntico al que se elimina' }, { status: 400 });
  }

  const plan = { method: 'DELETE' as const, path: recordPath(table.entity, code), description: `Eliminar registro ${code} de ${table.name}` };
  const st = await fetchRecordState(table.entity, code);
  if (!st.success) return notFound(table.name, code, st.error);

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'SAP no permitió eliminar el registro');
  return NextResponse.json({ success: true, message: `Registro ${code} eliminado de ${table.name}` });
}
