import { NextResponse } from 'next/server';
import { SlWritePlan, executeWrite, guardWrite, parseDocId, slErrorResponse } from '@/lib/purchasing';
import { fetchInvState, getInvConfig } from '@/lib/inventory';

/**
 * POST /api/sap/inventory/[kind]/[id]/[action]
 *   cancel → POST /{Entity}({id})/Cancel   (entradas, salidas, traslados, solicitudes)
 *   close  → POST /{Entity}({id})/Close    (solicitudes de traslado, recuentos)
 *   save-draft-to-document (borradores):
 *       Drafts               → POST /DraftsService_SaveDraftToDocument {"Document":{"DocEntry":n}}
 *       StockTransferDrafts  → POST /StockTransferDrafts({id})/SaveDraftToDocument
 * Las acciones enlazables se envían con cuerpo {} (el SL responde -1116 si no hay cuerpo JSON).
 * Acepta ?dryRun=1; requiere SAP_ALLOW_WRITES=true.
 */

type Ctx = { params: Promise<{ kind: string; id: string; action: string }> };

const ACTION_MAP = { cancel: 'Cancel', close: 'Close' } as const;

export async function POST(request: Request, { params }: Ctx) {
  const { kind, id, action } = await params;
  const cfg = getInvConfig(kind);
  if (!cfg) return NextResponse.json({ success: false, error: `Tipo no soportado: ${kind}` }, { status: 404 });
  const docId = parseDocId(id);
  if (!docId) return NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 });

  let plan: SlWritePlan;
  const isDraftAction = action === 'save-draft-to-document';
  if (isDraftAction) {
    if (!cfg.drafts) {
      return NextResponse.json({ success: false, error: `${cfg.label} no maneja borradores` }, { status: 405 });
    }
    plan =
      cfg.drafts.entity === 'Drafts'
        ? {
            method: 'POST',
            path: 'DraftsService_SaveDraftToDocument',
            body: { Document: { DocEntry: docId } },
            description: `Convertir borrador ${docId} en ${cfg.label}`
          }
        : {
            method: 'POST',
            path: `StockTransferDrafts(${docId})/SaveDraftToDocument`,
            body: {},
            description: `Convertir borrador ${docId} en ${cfg.label}`
          };
  } else if (action in ACTION_MAP) {
    const a = action as keyof typeof ACTION_MAP;
    if (!cfg.actions[a]) {
      return NextResponse.json({ success: false, error: `La acción "${action}" no está disponible para ${cfg.label}` }, { status: 405 });
    }
    plan = { method: 'POST', path: `${cfg.entity}(${docId})/${ACTION_MAP[a]}`, body: {}, description: `${ACTION_MAP[a]} ${cfg.label} ${docId}` };
  } else {
    return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 404 });
  }

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const st = await fetchInvState(cfg, isDraftAction ? 'drafts' : 'documents', docId);
  if (!st.success) {
    if ('wrongType' in st && st.wrongType) {
      return NextResponse.json({ success: false, error: `El borrador ${docId} no corresponde a ${cfg.label}` }, { status: 409 });
    }
    return slErrorResponse(st.error, `No se encontró el documento ${docId}`);
  }
  if (st.status === 'Cancelado') return NextResponse.json({ success: false, error: 'El documento ya está cancelado' }, { status: 409 });
  if (st.status === 'Cerrado') return NextResponse.json({ success: false, error: 'El documento ya está cerrado' }, { status: 409 });

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `SAP rechazó la acción ${action}`);
  return NextResponse.json({ success: true, message: `${plan.description}: realizado en SAP`, data: result.data ?? null });
}
