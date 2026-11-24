import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, parseDocId, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildNumberPatch, getNumberConfig, mapNumberRow } from '@/lib/inventoryNumbers';

/**
 * /api/sap/inventory/numbers/[type]/[id]   (id = DocEntry del registro de serie / lote)
 * GET    → detalle
 * PATCH  → actualiza atributos (fechas, atributos, ubicación, detalles, estado del lote)
 * PUT    → alias de PATCH
 * DELETE → 405 (no soportado por el Service Layer / DI API)
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ type: string; id: string }> };

async function resolve(ctx: Ctx) {
  const { type, id } = await ctx.params;
  const cfg = getNumberConfig(type);
  if (!cfg) return { error: NextResponse.json({ success: false, error: `Tipo no soportado: ${type}` }, { status: 404 }) };
  const entry = parseDocId(id);
  if (!entry) return { error: NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 }) };
  return { cfg, entry } as const;
}

export async function GET(_request: Request, ctx: Ctx) {
  const r = await resolve(ctx);
  if ('error' in r) return r.error;
  const res = await querySapServiceLayer<Record<string, unknown>>(`${r.cfg.entity}(${r.entry})`, { method: 'GET' });
  if (!res.success || !res.data) return NextResponse.json({ success: false, error: `No se encontró ${r.cfg.label} ${r.entry}` }, { status: 404 });
  return NextResponse.json({ success: true, data: mapNumberRow(r.cfg.type, res.data) });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const r = await resolve(ctx);
  if ('error' in r) return r.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildNumberPatch(r.cfg.type, body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: `${r.cfg.entity}(${r.entry})`, body: v.value, description: `Actualizar ${r.cfg.label} ${r.entry}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar ${r.cfg.label} en SAP`);
  return NextResponse.json({ success: true, message: `${r.cfg.label} ${r.entry} actualizado en SAP` });
}

export const PUT = PATCH;

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'SAP Service Layer no permite eliminar series ni lotes.' },
    { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}
