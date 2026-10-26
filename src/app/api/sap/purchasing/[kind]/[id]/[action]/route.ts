import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  executeWrite,
  getPurchaseConfig,
  guardWrite,
  parseDocId,
  slErrorResponse,
  SlWritePlan
} from '@/lib/purchasing';

/**
 * POST /api/sap/purchasing/[kind]/[id]/[action]
 *   action = cancel | close | reopen            → POST /{Entity}({DocEntry})/Cancel|Close|Reopen
 *   action = save-draft-to-document (borrador)  → POST /DraftsService_SaveDraftToDocument
 *
 * Acciones enlazables verificadas en $metadata (FunctionImport IsBindable sobre SAPB1.Document).
 * Reopen solo aplica a Órdenes de Compra. Acepta ?dryRun=1; requiere SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ kind: string; id: string; action: string }> };

const ACTION_MAP = { cancel: 'Cancel', close: 'Close', reopen: 'Reopen' } as const;

export async function POST(request: Request, { params }: Ctx) {
  const { kind, id, action } = await params;
  const cfg = getPurchaseConfig(kind);
  if (!cfg) return NextResponse.json({ success: false, error: `Tipo no soportado: ${kind}` }, { status: 404 });

  const docId = parseDocId(id);
  if (!docId) return NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 });

  let plan: SlWritePlan;
  if (action === 'save-draft-to-document') {
    plan = {
      method: 'POST',
      path: 'DraftsService_SaveDraftToDocument',
      body: { Document: { DocEntry: docId } },
      description: `Convertir borrador ${docId} en ${cfg.label}`
    };
  } else if (action in ACTION_MAP) {
    const a = action as keyof typeof ACTION_MAP;
    if (!cfg.actions[a]) {
      return NextResponse.json(
        { success: false, error: `La acción "${action}" no está disponible para ${cfg.label}` },
        { status: 405 }
      );
    }
    plan = {
      method: 'POST',
      path: `${cfg.entity}(${docId})/${ACTION_MAP[a]}`,
      description: `${ACTION_MAP[a]} ${cfg.label} ${docId}`
    };
  } else {
    return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 404 });
  }

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  // Validación de estado (solo lectura) antes de ejecutar
  const entitySet = action === 'save-draft-to-document' ? 'Drafts' : cfg.entity;
  const current = await querySapServiceLayer<{ DocumentStatus?: string; Cancelled?: string; DocObjectCode?: string }>(
    `${entitySet}(${docId})`,
    { method: 'GET', params: { '$select': entitySet === 'Drafts' ? 'DocEntry,DocumentStatus,Cancelled,DocObjectCode' : 'DocEntry,DocumentStatus,Cancelled' } }
  );
  if (!current.success || !current.data) return slErrorResponse(current.error, `No se encontró el documento ${docId}`);
  const st = current.data;
  if (entitySet === 'Drafts' && st.DocObjectCode !== cfg.draftObjectCode) {
    return NextResponse.json({ success: false, error: `El borrador ${docId} no corresponde a ${cfg.label}` }, { status: 409 });
  }
  if (st.Cancelled === 'tYES') {
    return NextResponse.json({ success: false, error: 'El documento ya está cancelado' }, { status: 409 });
  }
  if (action === 'reopen' && st.DocumentStatus !== 'bost_Close') {
    return NextResponse.json({ success: false, error: 'Solo se pueden reabrir documentos cerrados' }, { status: 409 });
  }
  if (action !== 'reopen' && st.DocumentStatus === 'bost_Close') {
    return NextResponse.json({ success: false, error: 'El documento ya está cerrado' }, { status: 409 });
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `SAP rechazó la acción ${action}`);

  return NextResponse.json({ success: true, message: `${plan.description}: realizado en SAP`, data: result.data ?? null });
}
