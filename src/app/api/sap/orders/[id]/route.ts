import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';

/**
 * GET /api/sap/orders/[id]
 * Detalle de solo lectura de un Pedido de Cliente (ORDR + RDR1) por DocEntry.
 * Si no existe ese DocEntry, intenta buscarlo por DocNum.
 */
interface SapOrderLine {
  LineNum: number;
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  RemainingOpenQuantity?: number | null;
  OpenQuantity?: number | null;
  Price?: number;
  DiscountPercent?: number;
  LineTotal?: number;
  OpenAmount?: number;
  WarehouseCode?: string;
  TaxCode?: string;
  MeasureUnit?: string;
  UoMCode?: string;
  LineStatus?: string;
  ShipDate?: string;
}

interface SapOrder {
  DocEntry: number;
  DocNum?: number;
  CardCode?: string;
  CardName?: string;
  NumAtCard?: string | null;
  FederalTaxID?: string;
  Address?: string;
  Address2?: string;
  DocDate?: string;
  DocDueDate?: string;
  TaxDate?: string;
  DocCurrency?: string;
  DocTotal?: number;
  VatSum?: number;
  DiscountPercent?: number;
  TotalDiscount?: number;
  DocumentStatus?: string;
  Cancelled?: string;
  Comments?: string | null;
  SalesPersonCode?: number;
  PaymentGroupCode?: number;
  DocumentLines?: SapOrderLine[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rawId = id.replace(/^ORD-/, '').trim();

  if (!/^\d+$/.test(rawId)) {
    return NextResponse.json(
      { success: false, error: `Identificador de pedido inválido: ${id}` },
      { status: 400 }
    );
  }

  // Solo lectura: GET por DocEntry
  let result = await querySapServiceLayer<SapOrder>(`Orders(${rawId})`, { method: 'GET' });

  // Si no se encuentra, intentar por DocNum
  if (!result.success || !result.data) {
    const filterResult = await querySapServiceLayer<SapOrder[]>('Orders', {
      method: 'GET',
      params: {
        '$filter': `DocNum eq ${rawId}`,
        '$top': '1'
      }
    });

    if (filterResult.success && Array.isArray(filterResult.data) && filterResult.data.length > 0) {
      result = {
        success: true,
        data: filterResult.data[0]
      };
    }
  }

  if (!result.success || !result.data) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || `No se encontró el pedido ${id} en SAP`
      },
      { status: 404 }
    );
  }

  const o = result.data;

  // Nombre del empleado de ventas (OSLP), solo lectura y opcional
  let salesPersonName = '';
  if (typeof o.SalesPersonCode === 'number' && o.SalesPersonCode >= 0) {
    const sp = await querySapServiceLayer<{ SalesEmployeeName?: string }>(`SalesPersons(${o.SalesPersonCode})`, {
      method: 'GET',
      params: { '$select': 'SalesEmployeeCode,SalesEmployeeName' }
    });
    if (sp.success && sp.data && sp.data.SalesEmployeeName) {
      salesPersonName = sp.data.SalesEmployeeName;
    }
  }

  const status = o.Cancelled === 'tYES' ? 'Cancelado' : o.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto';

  const lines = Array.isArray(o.DocumentLines)
    ? o.DocumentLines.map((l) => {
        const quantity = Number(l.Quantity) || 0;
        const openQty =
          l.RemainingOpenQuantity !== undefined && l.RemainingOpenQuantity !== null
            ? Number(l.RemainingOpenQuantity) || 0
            : l.OpenQuantity !== undefined && l.OpenQuantity !== null
              ? Number(l.OpenQuantity) || 0
              : quantity;
        return {
          lineNum: l.LineNum,
          itemCode: l.ItemCode || '',
          description: l.ItemDescription || '',
          quantity,
          openQuantity: openQty,
          deliveredQuantity: Math.max(0, quantity - openQty),
          price: Number(l.Price) || 0,
          discountPercent: Number(l.DiscountPercent) || 0,
          lineTotal: Number(l.LineTotal) || 0,
          openAmount: Number(l.OpenAmount) || 0,
          whsCode: l.WarehouseCode || '',
          taxCode: l.TaxCode || '',
          unitMsr: l.MeasureUnit || l.UoMCode || 'UN',
          lineStatus: l.LineStatus === 'bost_Close' ? 'Cerrada' : 'Abierta',
          shipDate: l.ShipDate ? String(l.ShipDate).slice(0, 10) : ''
        };
      })
    : [];

  const docTotal = Number(o.DocTotal) || 0;
  const vatSum = Number(o.VatSum) || 0;

  const detail = {
    docEntry: o.DocEntry,
    docNum: String(o.DocNum || o.DocEntry),
    cardCode: o.CardCode || '',
    cardName: o.CardName || '',
    numAtCard: o.NumAtCard || '',
    taxId: o.FederalTaxID || '—',
    address: o.Address2 || o.Address || '—',
    docDate: o.DocDate ? o.DocDate.slice(0, 10) : '',
    docDueDate: o.DocDueDate ? o.DocDueDate.slice(0, 10) : '',
    taxDate: o.TaxDate ? o.TaxDate.slice(0, 10) : '',
    currency: o.DocCurrency === '$' ? 'COP' : o.DocCurrency || 'COP',
    docTotal,
    vatSum,
    subtotal: docTotal - vatSum,
    discountPercent: Number(o.DiscountPercent) || 0,
    discountSum: Number(o.TotalDiscount) || 0,
    status,
    cancelled: o.Cancelled === 'tYES',
    comments: o.Comments || '',
    salesPersonCode: typeof o.SalesPersonCode === 'number' ? o.SalesPersonCode : null,
    salesPersonName,
    paymentGroup: o.PaymentGroupCode ?? '—',
    totalQuantity: lines.reduce((acc, l) => acc + l.quantity, 0),
    totalOpenQuantity: lines.reduce((acc, l) => acc + l.openQuantity, 0),
    openLinesCount: lines.filter((l) => l.lineStatus === 'Abierta').length,
    lines,
    raw: o
  };

  return NextResponse.json({
    success: true,
    data: detail,
    timestamp: new Date().toISOString()
  });
}
