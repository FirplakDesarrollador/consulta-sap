import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { collectFieldFilters, fetchFieldDefs, fieldFilterConditions, HBT_UDF_PREFIX, PARTNER_FILTER_FIELDS, PARTNER_LIST_FIELDS, pickHbtFields, SapRecord } from '@/lib/hbt';
import { esc } from '@/lib/items';
import { HbtPartnerRow } from '@/types/hbt';

/**
 * GET /api/sap/hbt/partners
 * Socios de negocio con sus campos de Localización HBT (U_HBT_* de OCRD: régimen tributario, tipo de documento,
 * municipio, autorretenedor, información tributaria, facturación electrónica…). Solo lectura (la edición es PATCH en /partners/[code]).
 *   page, limit (10–100), search (código, nombre o NIT), type=C|S|L, status=active|inactive,
 *   f.<Campo>=<valor> para: HBT_RegTrib, HBT_TipDoc, HBT_TipEnt, HBT_AutRet, HBT_InfoTrib, HBT_ConsumFinal, HBT_AplicaFel
 */
const CARD_TYPES: Record<string, string> = { C: 'cCustomer', S: 'cSupplier', L: 'cLid' };

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(sp.get('limit') || '25', 10) || 25));
  const search = (sp.get('search') || '').trim().slice(0, 60);
  const type = (sp.get('type') || '').toUpperCase();
  const status = sp.get('status') || '';
  if (type && !CARD_TYPES[type]) return validationErrorResponse(['type debe ser C (cliente), S (proveedor) o L (lead)']);
  if (status && status !== 'active' && status !== 'inactive') return validationErrorResponse(['status debe ser active o inactive']);

  const f = await fetchFieldDefs('OCRD', HBT_UDF_PREFIX);
  if (!f) return NextResponse.json({ success: false, error: 'No se pudo leer la definición de campos HBT de socios (UserFieldsMD)' }, { status: 502 });

  const parts: string[] = [];
  if (search) {
    const t = esc(search);
    parts.push(`(contains(CardCode,'${t}') or contains(CardName,'${t}') or contains(FederalTaxID,'${t}'))`);
  }
  if (type) parts.push(`CardType eq '${CARD_TYPES[type]}'`);
  if (status === 'active') parts.push(`Valid eq 'tYES' and Frozen eq 'tNO'`);
  if (status === 'inactive') parts.push(`(Valid eq 'tNO' or Frozen eq 'tYES')`);
  const ff = fieldFilterConditions(f.defs, collectFieldFilters(sp, PARTNER_FILTER_FIELDS));
  if (ff.errors.length > 0) return validationErrorResponse(ff.errors);
  if (ff.filter) parts.push(ff.filter);

  const listDefs = f.defs.filter((d) => PARTNER_LIST_FIELDS.includes(d.name));
  const params: Record<string, string> = {
    $select: ['CardCode', 'CardName', 'CardType', 'FederalTaxID', 'Valid', 'Frozen', ...listDefs.map((d) => d.sap)].join(','),
    $orderby: 'CardCode asc',
    $skip: String((page - 1) * limit),
    $inlinecount: 'allpages'
  };
  if (parts.length > 0) params.$filter = parts.join(' and ');

  const result = await querySapServiceLayer<SapRecord[]>('BusinessPartners', { method: 'GET', pageSize: limit, params });
  if (!result.success || !Array.isArray(result.data)) return slErrorResponse(result.error, 'No se pudieron consultar los socios de negocio');

  const data: HbtPartnerRow[] = result.data.map((o) => ({
    cardCode: String(o.CardCode ?? ''),
    cardName: String(o.CardName ?? ''),
    cardType: String(o.CardType ?? ''),
    federalTaxId: String(o.FederalTaxID ?? ''),
    active: o.Valid !== 'tNO' && o.Frozen !== 'tYES',
    fields: pickHbtFields(listDefs, o).fields
  }));
  const total = typeof result.total === 'number' ? result.total : undefined;
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    writesEnabled: sapWritesEnabled(),
    page,
    limit,
    count: data.length,
    total,
    hasMore: Boolean(result.nextLink) || (total !== undefined ? page * limit < total : data.length >= limit),
    data,
    timestamp: new Date().toISOString()
  });
}
