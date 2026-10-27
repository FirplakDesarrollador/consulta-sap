import { NextResponse } from 'next/server';
import { executeWrite, guardWrite, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { fetchItemState, itemPath, parseItemCode } from '@/lib/items';

/**
 * POST /api/sap/items/[code]/[action]   action = freeze | unfreeze
 *
 * Inactivar / activar un artículo (alternativa segura a DELETE). En SAP un artículo inactivo tiene
 * Frozen = tYES y Valid = tNO (así están todos los inactivos de la base consultada); activo es Frozen = tNO y
 * Valid = tYES. Se envía como PATCH, no como acción enlazable.
 *   freeze   → PATCH { Frozen: 'tYES', Valid: 'tNO' [, FrozenRemarks] }   Cuerpo opcional: { "remarks": "motivo" } (máx. 30)
 *   unfreeze → PATCH { Frozen: 'tNO',  Valid: 'tYES' }
 *
 * La acción enlazable `Cancel` que el $metadata declara sobre Items (SAPB1.Item) NO se expone: la documentación solo la
 * describe como "cancelar un registro de datos maestros" sin efecto de negocio definido para artículos, y no se puede
 * probar sin escribir en SAP. `ItemsService_InitData` es una acción POST (plantilla de valores por defecto) y tampoco se usa.
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ code: string; action: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code: raw, action } = await ctx.params;
  const code = parseItemCode(raw);
  if (!code) return NextResponse.json({ success: false, error: `Código de artículo inválido: ${raw}` }, { status: 400 });
  if (action !== 'freeze' && action !== 'unfreeze') {
    return NextResponse.json({ success: false, error: `La acción "${action}" no está disponible para artículos` }, { status: 404 });
  }

  let remarks = '';
  const text = await request.text();
  if (text.trim()) {
    try {
      const b = JSON.parse(text) as { remarks?: unknown };
      if (b.remarks !== undefined) {
        if (typeof b.remarks !== 'string') return validationErrorResponse(['remarks debe ser texto']);
        remarks = b.remarks.trim();
        if (remarks.length > 30) return validationErrorResponse(['El comentario admite máximo 30 caracteres']);
      }
    } catch {
      return validationErrorResponse(['El cuerpo debe ser JSON válido']);
    }
  }

  const body: Record<string, unknown> =
    action === 'freeze'
      ? { Frozen: 'tYES', Valid: 'tNO', ...(remarks ? { FrozenRemarks: remarks } : {}) }
      : { Frozen: 'tNO', Valid: 'tYES' };
  const plan = {
    method: 'PATCH' as const,
    path: itemPath(code),
    body,
    description: `${action === 'freeze' ? 'Inactivar' : 'Activar'} artículo ${code}`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchItemState(code);
  if (!st.success) {
    if (st.notFound) return NextResponse.json({ success: false, error: `No se encontró el artículo ${code} en SAP` }, { status: 404 });
    return slErrorResponse(st.error, 'No se pudo consultar el artículo');
  }
  if (action === 'freeze' && st.status === 'Inactivo') {
    return NextResponse.json({ success: false, error: 'El artículo ya está inactivo' }, { status: 409 });
  }
  if (action === 'unfreeze' && st.status === 'Activo') {
    return NextResponse.json({ success: false, error: 'El artículo ya está activo' }, { status: 409 });
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo ${action === 'freeze' ? 'inactivar' : 'activar'} el artículo en SAP`);
  return NextResponse.json({ success: true, message: `Artículo ${code} ${action === 'freeze' ? 'inactivado' : 'activado'} en SAP` });
}
