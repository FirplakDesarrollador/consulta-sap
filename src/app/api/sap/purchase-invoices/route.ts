import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { DocumentRow } from '@/types/sapBusiness';

interface SapPurchaseInvoiceHeader {
  DocEntry: number;
  DocNum: number;
  CardCode?: string;
  CardName?: string;
  DocDate?: string;
  DocDueDate?: string;
  TaxDate?: string;
  DocTotal?: number;
  DocCurrency?: string;
  DocumentStatus?: string;
  Comments?: string;
  NumAtCard?: string;
  VatSum?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10)));
  const skip = (page - 1) * limit;

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status');

  // Build OData $filter string for SAP Service Layer (PurchaseInvoices / OPCH)
  const filterParts: string[] = [];

  if (startDate) {
    filterParts.push(`DocDate ge '${startDate}'`);
  }
  if (endDate) {
    filterParts.push(`DocDate le '${endDate}'`);
  }

  if (status === 'Abierto') {
    filterParts.push(`DocumentStatus eq 'bost_Open'`);
  } else if (status === 'Cerrado') {
    filterParts.push(`DocumentStatus eq 'bost_Close'`);
  }

  if (search) {
    const isNum = /^\d+$/.test(search);
    if (isNum) {
      filterParts.push(`(DocNum eq ${search} or contains(CardName, '${search}') or contains(CardCode, '${search}') or contains(NumAtCard, '${search}'))`);
    } else {
      const sanitized = search.replace(/'/g, "''");
      filterParts.push(`(contains(CardName, '${sanitized}') or contains(CardCode, '${sanitized}') or contains(NumAtCard, '${sanitized}') or contains(Comments, '${sanitized}'))`);
    }
  }

  const filterString = filterParts.length > 0 ? filterParts.join(' and ') : undefined;

  const params: Record<string, string> = {
    '$skip': String(skip),
    '$orderby': 'DocEntry desc',
    '$select': 'DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocTotal,DocCurrency,DocumentStatus,Comments,NumAtCard,VatSum'
  };

  if (filterString) {
    params['$filter'] = filterString;
  }

  const result = await querySapServiceLayer('PurchaseInvoices', {
    pageSize: limit,
    params
  });

  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'No se pudieron obtener las facturas de proveedores de SAP',
        data: [],
        page,
        limit,
        total: 0,
        hasMore: false
      },
      { status: 500 }
    );
  }

  const mappedInvoices: DocumentRow[] = (result.data as SapPurchaseInvoiceHeader[]).map((inv) => ({
    id: `PUR-INV-${inv.DocEntry}`,
    docNum: String(inv.DocNum || inv.DocEntry),
    docType: 'Factura Proveedor',
    cardCode: inv.CardCode || '',
    cardName: inv.CardName || 'Proveedor sin nombre',
    docDate: inv.DocDate ? inv.DocDate.slice(0, 10) : '',
    docDueDate: inv.DocDueDate ? inv.DocDueDate.slice(0, 10) : '',
    docTotal: Number(inv.DocTotal) || 0,
    currency: inv.DocCurrency === '$' ? 'COP' : inv.DocCurrency || 'COP',
    status: inv.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto',
    comments: inv.Comments || '',
    numAtCard: inv.NumAtCard || '',
    vatSum: Number(inv.VatSum) || 0,
    itemsCount: 1,
    items: []
  }));

  const hasMore = Boolean(result.nextLink || mappedInvoices.length >= limit);

  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    page,
    limit,
    count: mappedInvoices.length,
    hasMore,
    nextLink: result.nextLink,
    data: mappedInvoices,
    timestamp: new Date().toISOString()
  });
}

