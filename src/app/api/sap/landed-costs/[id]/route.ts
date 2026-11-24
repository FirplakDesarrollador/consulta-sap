import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, parseDocId, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { SapLandedCost, buildLandedCostUpdatePayload, mapLandedCostRow } from '@/lib/landedCosts';

/**
 * /api/sap/landed-costs/[id]  (id = DocEntry)
 * GET    → detalle con líneas de artículos y costos
 * PATCH  → actualiza cabecera (Remarks, Reference, FileNumber, BillofLadingNumber, DueDate) si está abierto
 * PUT    → alias de PATCH (el PUT nativo del SL reemplazaría toda la entidad)
 * DELETE → no soportado por el Service Layer para este objeto: use cancel / close
 */

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const docId = parseDocId(id);
  if (!docId) return NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 });

  const result = await querySapServiceLayer<SapLandedCost>(`LandedCosts(${docId})`, { method: 'GET' });
  if (!result.success || !result.data) return slErrorResponse(result.error, `No se encontró el precio de entrega ${docId}`);

  const o = result.data;
  const row = mapLandedCostRow(o);
  const itemLines = (o.LandedCost_ItemLines || []).map((l) => ({
    lineNumber: Number(l.LineNumber) || 0,
    baseEntry: (l.BaseEntry as number) ?? null,
    baseLine: (l.BaseLine as number) ?? null,
    reference: String(l.Reference ?? ''),
    itemCode: String(l.Number ?? ''),
    description: String(l.ItemDescription ?? ''),
    quantity: Number(l.Quantity) || 0,
    baseDocumentPrice: Number(l.BaseDocumentPrice) || 0,
    warehouse: String(l.Warehouse ?? ''),
    totalCosts: Number(l.TotalCosts) || 0,
    warehousePrice: Number(l.WarehousePrice) || 0,
    lineTotal: Number(l.LineTotal) || 0
  }));
  const costLines = (o.LandedCost_CostLines || []).map((l) => ({
    landedCostCode: String(l.LandedCostCode ?? ''),
    amount: Number(l.Amount) || 0,
    allocationBy: String(l.AllocationBy ?? ''),
    costType: String(l.CostType ?? ''),
    factor: Number(l.Factor) || 0
  }));

  return NextResponse.json({
    success: true,
    data: {
      ...row,
      broker: o.BrokerName || o.Broker || '',
      billOfLadingNumber: o.BillofLadingNumber || '',
      beforeTax: Number(o.BeforeTax) || 0,
      itemLines,
      costLines,
      allowed: {
        update: row.status === 'Abierto',
        cancel: row.status === 'Abierto',
        close: row.status === 'Abierto',
        delete: false
      },
      raw: o
    }
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const docId = parseDocId(id);
  if (!docId) return NextResponse.json({ success: false, error: `Identificador inválido: ${id}` }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildLandedCostUpdatePayload(body);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: `LandedCosts(${docId})`, body: v.value, description: `Actualizar precio de entrega ${docId}` };
  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const current = await querySapServiceLayer<SapLandedCost>(`LandedCosts(${docId})`, {
    method: 'GET',
    params: { '$select': 'DocEntry,ClosedDocument' }
  });
  if (!current.success || !current.data) return slErrorResponse(current.error, `No se encontró el precio de entrega ${docId}`);
  if (current.data.ClosedDocument === 'lcClosed') {
    return NextResponse.json({ success: false, error: 'El precio de entrega está cerrado' }, { status: 409 });
  }

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, 'No se pudo actualizar el precio de entrega');
  return NextResponse.json({ success: true, message: `Precio de entrega ${docId} actualizado en SAP` });
}

export const PUT = PATCH;

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'SAP Service Layer no permite eliminar Precios de Entrega. Use Cancelar (CancelLandedCost) o Cerrar (CloseLandedCost).'
    },
    { status: 405, headers: { Allow: 'GET, PATCH, PUT' } }
  );
}
