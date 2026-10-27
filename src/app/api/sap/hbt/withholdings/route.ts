import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { collectFieldFilters, fetchFieldDefs, fieldFilterConditions, HBT_UDF_PREFIX, pickHbtFields, SapRecord, WTAX_LIST_SELECT } from '@/lib/hbt';
import { esc } from '@/lib/items';
import { HbtWithholdingRow } from '@/types/hbt';

/**
 * GET /api/sap/hbt/withholdings
 * Códigos de retención (WithholdingTaxCodes / OWHT) con los campos de Localización HBT (U_HBT_*: tipo de retención,
 * base mínima, municipio, actividad económica, afecta compras/ventas…). Solo lectura aquí; la edición de campos HBT es PATCH en
 * /withholdings/[code]. No se crean ni eliminan retenciones (las gestiona SAP / contabilidad).
 *   page, limit (10–100), search (código o nombre), inactive=0|1|all (por defecto solo activas),
 *   f.HBT_TipRet, f.HBT_Afecta, f.HBT_TrabInde, f.HBT_RtncionAsumida, f.HBT_TipImpu = valor
 */
const FILTER_FIELDS = ['HBT_TipRet', 'HBT_Afecta', 'HBT_TrabInde', 'HBT_RtncionAsumida', 'HBT_TipImpu', 'HBT_TipRetMM', 'HBT_TipoAutoRet'];

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(sp.get('limit') || '50', 10) || 50));
  const search = (sp.get('search') || '').trim().slice(0, 60);
  const inactive = sp.get('inactive') || '0';
  if (!['0', '1', 'all'].includes(inactive)) return validationErrorResponse(['inactive debe ser 0, 1 o all']);

  const f = await fetchFieldDefs('OWHT', HBT_UDF_PREFIX);
  if (!f) return NextResponse.json({ success: false, error: 'No se pudo leer la definición de campos HBT de retenciones (UserFieldsMD)' }, { status: 502 });

  const parts: string[] = [];
  if (search) {
    const t = esc(search);
    parts.push(`(contains(WTCode,'${t}') or contains(WTName,'${t}'))`);
  }
  if (inactive === '0') parts.push(`Inactive eq 'tNO'`);
  if (inactive === '1') parts.push(`Inactive eq 'tYES'`);
  const ff = fieldFilterConditions(f.defs, collectFieldFilters(sp, FILTER_FIELDS));
  if (ff.errors.length > 0) return validationErrorResponse(ff.errors);
  if (ff.filter) parts.push(ff.filter);

  const params: Record<string, string> = {
    $select: [...WTAX_LIST_SELECT, ...f.defs.filter((d) => !d.secret).map((d) => d.sap)].join(','),
    $orderby: 'WTCode asc',
    $skip: String((page - 1) * limit),
    $inlinecount: 'allpages'
  };
  if (parts.length > 0) params.$filter = parts.join(' and ');

  const result = await querySapServiceLayer<SapRecord[]>('WithholdingTaxCodes', { method: 'GET', pageSize: limit, params });
  if (!result.success || !Array.isArray(result.data)) return slErrorResponse(result.error, 'No se pudieron consultar las retenciones');

  const n = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const data: HbtWithholdingRow[] = result.data.map((o) => ({
    wtCode: String(o.WTCode ?? ''),
    wtName: String(o.WTName ?? ''),
    category: String(o.Category ?? ''),
    baseType: String(o.BaseType ?? ''),
    baseAmount: n(o.BaseAmount),
    rate: n(o.Rate),
    officialCode: String(o.OfficialCode ?? ''),
    account: String(o.Account ?? ''),
    withholdingType: String(o.WithholdingType ?? ''),
    effectiveFrom: typeof o.EffectiveFrom === 'string' ? o.EffectiveFrom.slice(0, 10) : '',
    inactive: o.Inactive === 'tYES',
    fields: pickHbtFields(f.defs, o).fields
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
    fieldDefs: f.defs.filter((d) => !d.secret),
    timestamp: new Date().toISOString()
  });
}
