import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { ISO_DATE, sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { EINV_DELIVERY, EINV_DIAN, EINV_LIST_SELECT, EINV_STATUS, HBT_DOC_TYPES, mapEInvoiceRow, parseDocType, SapRecord } from '@/lib/hbt';
import { esc } from '@/lib/items';

/**
 * GET /api/sap/hbt/einvoicing
 * Estado de facturación electrónica de los documentos (campos U_HBT_EstadoCE, U_HBT_DetalleEstado, U_HBT_EstadoDIAN, U_HBT_EstadoEntrega…
 * que escribe el complemento HBT al enviar a la DIAN). SOLO LECTURA: el envío, reintento y anulación de documentos electrónicos
 * los hace el complemento HBT; esta aplicación no modifica documentos.
 *   type=invoices|credit-notes|purchase-invoices|purchase-credit-notes|delivery-notes (por defecto invoices)
 *   status=1..5 (U_HBT_EstadoCE), from / to (AAAA-MM-DD sobre DocDate), search (N.º de documento, código o nombre del socio),
 *   page, limit (10–100)
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const type = parseDocType(sp.get('type') || 'invoices');
  if (!type) return validationErrorResponse([`type debe ser uno de: ${Object.keys(HBT_DOC_TYPES).join(', ')}`]);
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(sp.get('limit') || '25', 10) || 25));
  const search = (sp.get('search') || '').trim().slice(0, 60);
  const status = sp.get('status') || '';
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  const errors: string[] = [];
  if (status && !/^[1-5]$/.test(status)) errors.push('status debe ser un número de 1 a 5');
  if (from && !ISO_DATE.test(from)) errors.push('from debe ser AAAA-MM-DD');
  if (to && !ISO_DATE.test(to)) errors.push('to debe ser AAAA-MM-DD');
  if (errors.length > 0) return validationErrorResponse(errors);

  const parts: string[] = [];
  if (status) parts.push(`U_HBT_EstadoCE eq ${Number(status)}`); // campo numérico: el literal debe ser número
  if (from) parts.push(`DocDate ge '${from}'`);
  if (to) parts.push(`DocDate le '${to}'`);
  if (search) {
    const t = esc(search);
    if (/^\d{1,9}$/.test(search)) parts.push(`(DocNum eq ${Number(search)} or contains(CardCode,'${t}') or contains(CardName,'${t}'))`);
    else parts.push(`(contains(CardCode,'${t}') or contains(CardName,'${t}'))`);
  }

  const dt = HBT_DOC_TYPES[type];
  const params: Record<string, string> = {
    $select: EINV_LIST_SELECT.join(','),
    $orderby: 'DocEntry desc',
    $skip: String((page - 1) * limit),
    $inlinecount: 'allpages'
  };
  if (parts.length > 0) params.$filter = parts.join(' and ');

  const result = await querySapServiceLayer<SapRecord[]>(dt.entity, { method: 'GET', pageSize: limit, params });
  if (!result.success || !Array.isArray(result.data)) return slErrorResponse(result.error, `No se pudieron consultar los documentos (${dt.label})`);
  const data = result.data.map(mapEInvoiceRow);
  const total = typeof result.total === 'number' ? result.total : undefined;
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    readOnly: true,
    writesEnabled: sapWritesEnabled(),
    type,
    typeLabel: dt.label,
    page,
    limit,
    count: data.length,
    total,
    hasMore: Boolean(result.nextLink) || (total !== undefined ? page * limit < total : data.length >= limit),
    data,
    legend: { status: EINV_STATUS, dian: EINV_DIAN, delivery: EINV_DELIVERY },
    timestamp: new Date().toISOString()
  });
}
