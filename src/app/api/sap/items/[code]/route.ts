import { NextResponse } from 'next/server';
import { executeWrite, guardWrite, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildItemUpdatePayload, fetchItem, fetchItemState, itemPath, mapItemDetail, parseItemCode } from '@/lib/items';

/**
 * /api/sap/items/[code]
 *
 * GET    → detalle completo (campos, campos de usuario, existencias por almacén, precios, códigos de barras).
 *          ?allPrices=1 incluye también las listas con precio 0.
 * PATCH  → actualización diferencial de campos de la lista blanca (itemFields.ts). El código no se modifica y los
 *          campos "solo al crear" se rechazan. Existencias, precios y colecciones son de solo lectura aquí.
 * PUT    → alias de PATCH (el PUT del SL resetea las propiedades omitidas, guía §3.4.3).
 * DELETE → elimina el artículo (guía §5.2.4). SAP lo rechaza si tiene movimientos: el error del SL se devuelve tal cual.
 *          Exige ?confirm=<código> idéntico al artículo (la simulación ?dryRun=1 no lo exige).
 *          La alternativa segura es Inactivar (acción "freeze").
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ code: string }> };

async function resolveCode(ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = parseItemCode(raw);
  if (!code) return { error: NextResponse.json({ success: false, error: `Código de artículo inválido: ${raw}` }, { status: 400 }) };
  return { code } as const;
}

function notFound(code: string, error?: string) {
  if (error && !/HTTP 404/.test(error)) return slErrorResponse(error, `No se pudo consultar el artículo ${code}`);
  return NextResponse.json({ success: false, error: `No se encontró el artículo ${code} en SAP` }, { status: 404 });
}

export async function GET(request: Request, ctx: Ctx) {
  const r = await resolveCode(ctx);
  if ('error' in r) return r.error;
  const res = await fetchItem(r.code);
  if (!res.success || !res.data) return notFound(r.code, res.error);
  const allPrices = new URL(request.url).searchParams.get('allPrices') === '1';
  return NextResponse.json({ success: true, data: mapItemDetail(res.data, allPrices), timestamp: new Date().toISOString() });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const r = await resolveCode(ctx);
  if ('error' in r) return r.error;
  const { code } = r;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildItemUpdatePayload(body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: itemPath(code), body: v.value, description: `Actualizar artículo ${code}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchItemState(code);
  if (!st.success) return notFound(code, st.error);

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo actualizar el artículo en SAP');
  return NextResponse.json({ success: true, message: `Artículo ${code} actualizado en SAP` });
}

/** PUT enrutado a PATCH (ver cabecera) */
export const PUT = PATCH;

export async function DELETE(request: Request, ctx: Ctx) {
  const r = await resolveCode(ctx);
  if ('error' in r) return r.error;
  const { code } = r;
  const url = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes((url.searchParams.get('dryRun') || '').toLowerCase());

  if (!dryRun && url.searchParams.get('confirm') !== code) {
    return NextResponse.json(
      { success: false, error: 'Confirmación requerida: envíe ?confirm=<código del artículo> idéntico al que se elimina' },
      { status: 400 }
    );
  }

  const plan = {
    method: 'DELETE' as const,
    path: itemPath(code),
    description: `Eliminar artículo ${code} (SAP lo rechaza si tiene movimientos; use Inactivar como alternativa)`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchItemState(code);
  if (!st.success) return notFound(code, st.error);

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'SAP no permitió eliminar el artículo');
  return NextResponse.json({ success: true, message: `Artículo ${code} eliminado de SAP` });
}
