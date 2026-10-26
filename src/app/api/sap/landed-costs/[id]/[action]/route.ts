import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, parseDocId, slErrorResponse } from '@/lib/purchasing';

/**
 * POST /api/sap/landed-costs/[id]/[action]
 *   cancel → POST /LandedCosts({DocEntry})/CancelLandedCost
 *   close  → POST /LandedCosts({DocEntry})/CloseLandedCost
 * Acciones enlazables verificadas en $metadata (binding SAPB1.LandedCost). ?dryRun=1 disponible.
 */

type Ctx = { params: Promise<{ id: string; action: string }> };
const MAP = { cancel: 'CancelLandedCost', close: 'CloseLandedCost' } as const;

export async function POST(request: Request, { params }: Ctx) {
  const { id, action } = await params;
  const docId = parseDocId(id);
  if (!docId) return NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 });
  if (!(action in MAP)) return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 404 });

  const slAction = MAP[action as keyof typeof MAP];
  const plan = { method: 'POST' as const, path: `LandedCosts(${docId})/${slAction}`, description: `${slAction} ${docId}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const current = await querySapServiceLayer<{ ClosedDocument?: string }>(`LandedCosts(${docId})`, {
    method: 'GET',
    params: { '$select': 'DocEntry,ClosedDocument' }
  });
  if (!current.success || !current.data) return slErrorResponse(current.error, `No se encontró el precio de entrega ${docId}`);
  if (current.data.ClosedDocument === 'lcClosed') {
    return NextResponse.json({ success: false, error: 'El precio de entrega ya está cerrado' }, { status: 409 });
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `SAP rechazó ${slAction}`);
  return NextResponse.json({ success: true, message: `${slAction} realizado en SAP` });
}
