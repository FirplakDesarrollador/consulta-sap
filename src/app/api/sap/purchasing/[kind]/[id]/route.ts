import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  buildUpdatePayload,
  executeWrite,
  fetchDocByIdOrNum,
  getPurchaseConfig,
  guardWrite,
  mapDetail,
  parseDocId,
  parseSource,
  slErrorResponse,
  validationErrorResponse
} from '@/lib/purchasing';

/**
 * /api/sap/purchasing/[kind]/[id]   (id = DocEntry; GET también acepta DocNum)
 *
 * GET    → detalle con líneas (?source=drafts para borradores, ?by=docnum para forzar búsqueda por DocNum)
 * PATCH  → actualización diferencial (SL PATCH). Solo documentos abiertos y campos permitidos.
 * PUT    → alias de PATCH. El PUT nativo del Service Layer REEMPLAZA la entidad y pone en valor por defecto
 *          todo lo que no se envíe, lo que en un documento de compra sería destructivo; por eso aquí se
 *          enruta a PATCH.
 * DELETE → solo borradores (?source=drafts). Los documentos de compra no admiten DELETE en el SL
 *          (error -5006): use las acciones cancel / close.
 * Todas las escrituras aceptan ?dryRun=1 y requieren SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ kind: string; id: string }> };

async function resolve(request: Request, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const cfg = getPurchaseConfig(kind);
  if (!cfg) {
    return { error: NextResponse.json({ success: false, error: `Tipo no soportado: ${kind}` }, { status: 404 }) };
  }
  const docId = parseDocId(id);
  if (!docId) {
    return { error: NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 }) };
  }
  const url = new URL(request.url);
  const source = /^DRF-/i.test(id) ? 'drafts' : parseSource(url.searchParams.get('source'));
  return { cfg, docId, source, byDocNum: url.searchParams.get('by') === 'docnum' } as const;
}

export async function GET(request: Request, ctx: Ctx) {
  const r = await resolve(request, ctx);
  if ('error' in r) return r.error;
  const { cfg, docId, source, byDocNum } = r;

  const entitySet = source === 'drafts' ? 'Drafts' : cfg.entity;
  const extraFilter = source === 'drafts' ? `DocObjectCode eq '${cfg.draftObjectCode}'` : undefined;
  const result = await fetchDocByIdOrNum(entitySet, docId, extraFilter, byDocNum);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { success: false, error: `No se encontró ${cfg.label} ${docId} en SAP` },
      { status: 404 }
    );
  }

  const o = result.data;
  let buyerName = '';
  if (typeof o.SalesPersonCode === 'number' && o.SalesPersonCode >= 0) {
    const sp = await querySapServiceLayer<{ SalesEmployeeName?: string }>(`SalesPersons(${o.SalesPersonCode})`, {
      method: 'GET',
      params: { '$select': 'SalesEmployeeCode,SalesEmployeeName' }
    });
    if (sp.success && sp.data?.SalesEmployeeName) buyerName = sp.data.SalesEmployeeName;
  }

  return NextResponse.json({
    success: true,
    data: mapDetail(cfg, source, o, buyerName),
    timestamp: new Date().toISOString()
  });
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

  const v = buildUpdatePayload(cfg, source, body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const entitySet = source === 'drafts' ? 'Drafts' : cfg.entity;
  const plan = {
    method: 'PATCH' as const,
    path: `${entitySet}(${docId})`,
    body: v.value,
    description: `Actualizar ${source === 'drafts' ? 'borrador de ' : ''}${cfg.label} ${docId}`
  };

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  // Verificar estado actual antes de escribir (solo lectura)
  const current = await querySapServiceLayer<{ DocumentStatus?: string; Cancelled?: string }>(`${entitySet}(${docId})`, {
    method: 'GET',
    params: { '$select': 'DocEntry,DocumentStatus,Cancelled' }
  });
  if (!current.success || !current.data) return slErrorResponse(current.error, `No se encontró ${cfg.label} ${docId}`);
  if (current.data.Cancelled === 'tYES' || current.data.DocumentStatus === 'bost_Close') {
    return NextResponse.json(
      { success: false, error: 'Solo se pueden modificar documentos abiertos (no cerrados ni cancelados)' },
      { status: 409 }
    );
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar ${cfg.label} en SAP`);

  return NextResponse.json({ success: true, message: `${cfg.label} ${docId} actualizado en SAP` });
}

/** PUT enrutado a PATCH (ver nota en la cabecera) */
export const PUT = PATCH;

export async function DELETE(request: Request, ctx: Ctx) {
  const r = await resolve(request, ctx);
  if ('error' in r) return r.error;
  const { cfg, docId, source } = r;

  if (source !== 'drafts') {
    return NextResponse.json(
      {
        success: false,
        error: `SAP Service Layer no permite eliminar documentos de ${cfg.label} (código -5006). Use Cancelar o Cerrar.`
      },
      { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
    );
  }

  const plan = {
    method: 'DELETE' as const,
    path: `Drafts(${docId})`,
    description: `Eliminar borrador de ${cfg.label} ${docId}`
  };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  // Confirmar que el borrador es del tipo correcto antes de borrar (solo lectura)
  const current = await querySapServiceLayer<{ DocObjectCode?: string }>(`Drafts(${docId})`, {
    method: 'GET',
    params: { '$select': 'DocEntry,DocObjectCode' }
  });
  if (!current.success || !current.data) return slErrorResponse(current.error, `No se encontró el borrador ${docId}`);
  if (current.data.DocObjectCode !== cfg.draftObjectCode) {
    return NextResponse.json(
      { success: false, error: `El borrador ${docId} no corresponde a ${cfg.label}` },
      { status: 409 }
    );
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo eliminar el borrador en SAP');
  return NextResponse.json({ success: true, message: `Borrador ${docId} eliminado de SAP` });
}
