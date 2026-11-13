import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';

interface SapInvoiceLine {
  LineNum: number;
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  Price?: number;
  PriceAfterVAT?: number;
  DiscountPercent?: number;
  LineTotal?: number;
  GrossTotal?: number;
  WarehouseCode?: string;
  TaxCode?: string;
  TaxTotal?: number;
  MeasureUnit?: string;
  UnitsOfMeasurment?: string;
  BaseType?: number;
  BaseEntry?: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rawId = id.replace(/^(PUR-INV-|INV-)/, '').trim();

  // Try direct by DocEntry first
  let result = await querySapServiceLayer(`PurchaseInvoices(${rawId})`);

  // If not found or error, try by DocNum filter
  if (!result.success || !result.data) {
    const isNum = /^\d+$/.test(rawId);
    const filterQuery = isNum
      ? `DocNum eq ${rawId}`
      : `NumAtCard eq '${rawId.replace(/'/g, "''")}'`;

    const filterResult = await querySapServiceLayer('PurchaseInvoices', {
      params: {
        '$filter': filterQuery,
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
        error: result.error || `No se encontró la factura de proveedor ${id} en SAP`
      },
      { status: 404 }
    );
  }

  const inv = result.data;

  // Format detailed purchase invoice object
  const detail = {
    docEntry: inv.DocEntry,
    docNum: String(inv.DocNum || inv.DocEntry),
    numAtCard: inv.NumAtCard || '—',
    cardCode: inv.CardCode,
    cardName: inv.CardName,
    taxId: inv.FederalTaxID || '—',
    address: inv.Address || inv.Address2 || '—',
    docDate: inv.DocDate ? inv.DocDate.slice(0, 10) : '',
    docDueDate: inv.DocDueDate ? inv.DocDueDate.slice(0, 10) : '',
    taxDate: inv.TaxDate ? inv.TaxDate.slice(0, 10) : '',
    currency: inv.DocCurrency === '$' ? 'COP' : inv.DocCurrency || 'COP',
    docTotal: Number(inv.DocTotal) || 0,
    vatSum: Number(inv.VatSum) || 0,
    subtotal: (Number(inv.DocTotal) || 0) - (Number(inv.VatSum) || 0),
    discountPercent: Number(inv.DiscountPercent) || 0,
    discountSum: Number(inv.TotalDiscount) || 0,
    status: inv.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto',
    comments: inv.Comments || '',
    controlAccount: inv.ControlAccount || '—',
    paymentGroup: inv.PaymentGroupCode || '—',
    lines: Array.isArray(inv.DocumentLines)
      ? (inv.DocumentLines as SapInvoiceLine[]).map((l) => ({
          lineNum: l.LineNum,
          itemCode: l.ItemCode || '',
          description: l.ItemDescription || '',
          quantity: Number(l.Quantity) || 1,
          price: Number(l.Price) || 0,
          priceAfterVAT: Number(l.PriceAfterVAT) || 0,
          discountPercent: Number(l.DiscountPercent) || 0,
          lineTotal: Number(l.LineTotal) || 0,
          grossTotal: Number(l.GrossTotal) || Number(l.LineTotal) || 0,
          whsCode: l.WarehouseCode || '',
          taxCode: l.TaxCode || '',
          taxTotal: Number(l.TaxTotal) || 0,
          unitMsr: l.MeasureUnit || l.UnitsOfMeasurment || 'UN',
          baseType: l.BaseType,
          baseEntry: l.BaseEntry
        }))
      : [],
    raw: inv
  };

  return NextResponse.json({
    success: true,
    data: detail,
    timestamp: new Date().toISOString()
  });
}

