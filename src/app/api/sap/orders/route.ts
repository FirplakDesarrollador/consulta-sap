import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { DocumentRow } from '@/types/sapBusiness';

/**
 * GET /api/sap/orders
 * Consulta de solo lectura de Pedidos de Clientes (ORDR) en SAP Service Layer.
 *
 * Query params:
 *  - page, limit: paginación del lado del servidor
 *  - startDate, endDate: rango sobre DocDate (YYYY-MM-DD)
 *  - search: DocNum, CardCode, CardName o NumAtCard (referencia del cliente)
 *  - status: Abierto | Cerrado | Cancelado (también acepta open | closed | cancelled)
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface SapOrderHeader {
  DocEntry: number;
  DocNum?: number;
  CardCode?: string;
  CardName?: string;
  NumAtCard?: string | null;
  DocDate?: string;
  DocDueDate?: string;
  DocTotal?: number;
  DocCurrency?: string;
  DocumentStatus?: string;
  Cancelled?: string;
  SalesPersonCode?: number;
  Comments?: string | null;
}

function mapOrderStatus(o: { DocumentStatus?: string; Cancelled?: string }): DocumentRow['status'] {
  if (o.Cancelled === 'tYES') return 'Cancelado';
  return o.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto';
}

function normalizeStatus(raw: string | null): 'Abierto' | 'Cerrado' | 'Cancelado' | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === 'abierto' || s === 'open') return 'Abierto';
  if (s === 'cerrado' || s === 'closed') return 'Cerrado';
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'Cancelado';
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(250, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const skip = (page - 1) * limit;

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim();
  const status = normalizeStatus(searchParams.get('status'));

  // Build OData $filter string
  const filterParts: string[] = [];

  if (startDate && ISO_DATE.test(startDate)) {
    filterParts.push(`DocDate ge '${startDate}'`);
  }
  if (endDate && ISO_DATE.test(endDate)) {
    filterParts.push(`DocDate le '${endDate}'`);
  }

  if (status === 'Abierto') {
    filterParts.push(`DocumentStatus eq 'bost_Open' and Cancelled eq 'tNO'`);
  } else if (status === 'Cerrado') {
    filterParts.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tNO'`);
  } else if (status === 'Cancelado') {
    filterParts.push(`Cancelled eq 'tYES'`);
  }

  if (search) {
    const sanitized = search.replace(/'/g, "''");
    const textFilter = `contains(CardName, '${sanitized}') or contains(CardCode, '${sanitized}') or contains(NumAtCard, '${sanitized}')`;
    if (/^\d+$/.test(search)) {
      filterParts.push(`(DocNum eq ${search} or ${textFilter})`);
    } else {
      filterParts.push(`(${textFilter})`);
    }
  }

  const filterString = filterParts.length > 0 ? filterParts.join(' and ') : undefined;

  const params: Record<string, string> = {
    '$skip': String(skip),
    '$orderby': 'DocEntry desc',
    '$select':
      'DocEntry,DocNum,CardCode,CardName,NumAtCard,DocDate,DocDueDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,SalesPersonCode,Comments'
  };

  if (filterString) {
    params['$filter'] = filterString;
  }

  // Solo lectura: GET a /Orders
  const result = await querySapServiceLayer<SapOrderHeader[]>('Orders', {
    method: 'GET',
    pageSize: limit,
    params
  });

  if (!result.success || !Array.isArray(result.data)) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'No se pudieron obtener los pedidos de SAP',
        data: [],
        page,
        limit,
        total: 0,
        hasMore: false
      },
      { status: 500 }
    );
  }

  const mappedOrders: DocumentRow[] = result.data.map((o) => ({
    id: `ORD-${o.DocEntry}`,
    docNum: String(o.DocNum || o.DocEntry),
    docType: 'Pedido',
    cardCode: o.CardCode || '',
    cardName: o.CardName || 'Cliente sin nombre',
    docDate: o.DocDate ? o.DocDate.slice(0, 10) : '',
    docDueDate: o.DocDueDate ? o.DocDueDate.slice(0, 10) : '',
    docTotal: Number(o.DocTotal) || 0,
    currency: o.DocCurrency === '$' ? 'COP' : o.DocCurrency || 'COP',
    status: mapOrderStatus(o),
    comments: o.Comments || '',
    numAtCard: o.NumAtCard || '',
    salesPersonCode: typeof o.SalesPersonCode === 'number' ? o.SalesPersonCode : undefined,
    itemsCount: 1,
    items: []
  }));

  const hasMore = Boolean(result.nextLink || mappedOrders.length >= limit);

  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    page,
    limit,
    count: mappedOrders.length,
    hasMore,
    nextLink: result.nextLink,
    data: mappedOrders,
    timestamp: new Date().toISOString()
  });
}
