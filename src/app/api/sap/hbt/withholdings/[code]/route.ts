import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildFieldsUpdate, fetchFieldDefs, HBT_UDF_PREFIX, parseHbtCode, SapRecord, withholdingPath } from '@/lib/hbt';

/**
 * /api/sap/hbt/withholdings/[code]
 * PATCH → { fields: { HBT_Campo: valor } }: actualiza SOLO campos U_HBT_* del código de retención (la tasa, la base, la cuenta
 *         y demás propiedades contables de la retención no se modifican desde aquí).
 * PUT   → alias de PATCH. Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 * (El detalle es la misma fila de GET /api/sap/hbt/withholdings; no se exponen POST ni DELETE.)
 */
type Ctx = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const code = parseHbtCode((await ctx.params).code);
  if (!code) return NextResponse.json({ success: false, error: 'Código de retención inválido' }, { status: 400 });
  const f = await fetchFieldDefs('OWHT', HBT_UDF_PREFIX);
  if (!f) return NextResponse.json({ success: false, error: 'No se pudo leer la definición de campos HBT de retenciones (UserFieldsMD)' }, { status: 502 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildFieldsUpdate(body, f.defs);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: withholdingPath(code), body: v.value, description: `Actualizar campos HBT de la retención ${code}` };
  const st = await querySapServiceLayer<SapRecord>(withholdingPath(code), { method: 'GET', params: { $select: 'WTCode' } });
  if (!st.success) {
    if (st.error && !/HTTP 404/.test(st.error)) return slErrorResponse(st.error, `No se pudo consultar la retención ${code}`);
    return NextResponse.json({ success: false, error: `No se encontró la retención ${code}` }, { status: 404 });
  }

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar la retención ${code}`);
  return NextResponse.json({ success: true, message: `Campos HBT de la retención ${code} actualizados en SAP` });
}

export const PUT = PATCH;
