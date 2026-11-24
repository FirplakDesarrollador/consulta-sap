import { NextResponse } from 'next/server';
import {
  executeWrite,
  guardWrite,
  parseDocId,
  slErrorResponse,
  validationErrorResponse
} from '@/lib/purchasing';
import {
  buildInvUpdatePayload,
  entitySetFor,
  fetchInvDoc,
  fetchInvState,
  getInvConfig,
  mapInvDetail,
  parseInvSource
} from '@/lib/inventory';

/**
 * /api/sap/inventory/[kind]/[id]   (id = DocEntry/DocumentEntry; GET también acepta el número de documento)
 *
 * GET    → detalle con líneas (?source=drafts o id DRF-n para borradores, ?by=docnum para buscar por número)
 * PATCH  → actualización diferencial del SL. Solo documentos abiertos y campos permitidos por objeto.
 * PUT    → alias de PATCH (el PUT del SL reemplaza la entidad completa y resetearía lo no enviado).
 * DELETE → solo borradores. Los documentos de inventario no admiten DELETE en el SL (error -5006);
 *          recuentos y contabilizaciones tampoco (el servicio DI no tiene método Delete).
 * Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ kind: string; id: string }> };

async function resolve(request: Request, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const cfg = getInvConfig(kind);
  if (!cfg) return { error: NextResponse.json({ success: false, error: `Tipo no soportado: ${kind}` }, { status: 404 }) };
  const docId = parseDocId(id);
  if (!docId) return { error: NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 }) };
  const url = new URL(request.url);
  const source = /^DRF-/i.test(decodeURIComponent(id)) ? parseInvSource(cfg, 'drafts') : parseInvSource(cfg, url.searchParams.get('source'));
  return { cfg, docId, source, byNum: url.searchParams.get('by') === 'docnum' } as const;
}

export async function GET(request: Request, ctx: Ctx) {
  const r = await resolve(request, ctx);
  if ('error' in r) return r.error;
  const { cfg, docId, source, byNum } = r;

  const result = await fetchInvDoc(cfg, source, docId, byNum);
  if (!result.success || !result.data) {
    return NextResponse.json({ success: false, error: `No se encontró ${cfg.label} ${docId} en SAP` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: mapInvDetail(cfg, source, result.data), timestamp: new Date().toISOString() });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const r = await resolve(request, ctx);
  if ('error' in r) return r.error;
  const { cfg, docId, source } = r;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildInvUpdatePayload(cfg, source, body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = {
    method: 'PATCH' as const,
    path: `${entitySetFor(cfg, source)}(${docId})`,
    body: v.value,
    description: `Actualizar ${source === 'drafts' ? 'borrador de ' : ''}${cfg.label} ${docId}`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchInvState(cfg, source, docId);
  if (!st.success) {
    if ('wrongType' in st && st.wrongType) {
      return NextResponse.json({ success: false, error: `El borrador ${docId} no corresponde a ${cfg.label}` }, { status: 409 });
    }
    return slErrorResponse(st.error, `No se encontró ${cfg.label} ${docId}`);
  }
  if (st.status === 'Cerrado' || st.status === 'Cancelado') {
    return NextResponse.json({ success: false, error: 'Solo se pueden modificar documentos abiertos (no cerrados ni cancelados)' }, { status: 409 });
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar ${cfg.label} en SAP`);
  return NextResponse.json({ success: true, message: `${cfg.label} ${docId} actualizado en SAP` });
}

/** PUT enrutado a PATCH (ver cabecera) */
export const PUT = PATCH;

export async function DELETE(request: Request, ctx: Ctx) {
  const r = await resolve(request, ctx);
  if ('error' in r) return r.error;
  const { cfg, docId, source } = r;

  if (source !== 'drafts' || !cfg.drafts) {
    const hint = cfg.actions.cancel ? ' Use Cancelar.' : cfg.actions.close ? ' Use Cerrar.' : '';
    return NextResponse.json(
      { success: false, error: `SAP Service Layer no permite eliminar ${cfg.label} (código -5006).${hint}` },
      { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
    );
  }

  const plan = {
    method: 'DELETE' as const,
    path: `${cfg.drafts.entity}(${docId})`,
    description: `Eliminar borrador de ${cfg.label} ${docId}`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchInvState(cfg, source, docId);
  if (!st.success) {
    if ('wrongType' in st && st.wrongType) {
      return NextResponse.json({ success: false, error: `El borrador ${docId} no corresponde a ${cfg.label}` }, { status: 409 });
    }
    return slErrorResponse(st.error, `No se encontró el borrador ${docId}`);
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo eliminar el borrador en SAP');
  return NextResponse.json({ success: true, message: `Borrador ${docId} eliminado de SAP` });
}
