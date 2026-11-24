import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { ISO_DATE, validationErrorResponse } from '@/lib/purchasing';
import { EINV_STATUS, HBT_DOC_TYPES, mapLimit, parseDocType } from '@/lib/hbt';
import { HbtEInvoiceSummary } from '@/types/hbt';

/**
 * GET /api/sap/hbt/einvoicing/summary?type=invoices&from=&to=
 * Conteo de documentos por estado de facturación electrónica (U_HBT_EstadoCE 1–5) con $count. Solo lectura, caché de 60 s.
 */
const cache = new Map<string, { at: number; value: HbtEInvoiceSummary }>();
const TTL = 60_000;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const type = parseDocType(sp.get('type') || 'invoices');
  if (!type) return validationErrorResponse([`type debe ser uno de: ${Object.keys(HBT_DOC_TYPES).join(', ')}`]);
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  const errors: string[] = [];
  if (from && !ISO_DATE.test(from)) errors.push('from debe ser AAAA-MM-DD');
  if (to && !ISO_DATE.test(to)) errors.push('to debe ser AAAA-MM-DD');
  if (errors.length > 0) return validationErrorResponse(errors);

  const key = `${type}|${from}|${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ success: true, cached: true, data: hit.value, timestamp: new Date().toISOString() });

  const dates: string[] = [];
  if (from) dates.push(`DocDate ge '${from}'`);
  if (to) dates.push(`DocDate le '${to}'`);
  const entity = HBT_DOC_TYPES[type].entity;
  const count = async (extra?: string) => {
    const filter = [...dates, ...(extra ? [extra] : [])].join(' and ');
    const r = await querySapServiceLayer<unknown>(`${entity}/$count`, { method: 'GET', params: filter ? { $filter: filter } : undefined });
    const n = r.success ? Number(r.data) : NaN;
    return { ok: r.success && Number.isFinite(n), n, error: r.error };
  };

  const codes = Object.keys(EINV_STATUS).map(Number);
  const all = await mapLimit([undefined, ...codes], 3, (c) => count(c === undefined ? undefined : `U_HBT_EstadoCE eq ${c}`));
  if (all.some((r) => !r.ok)) {
    return NextResponse.json({ success: false, error: 'No se pudo contar los documentos por estado en SAP' }, { status: 502 });
  }
  const value: HbtEInvoiceSummary = {
    type,
    total: all[0].n,
    byStatus: codes.map((c, i) => ({ code: c, label: EINV_STATUS[c], count: all[i + 1].n }))
  };
  cache.set(key, { at: Date.now(), value });
  return NextResponse.json({ success: true, cached: false, data: value, timestamp: new Date().toISOString() });
}
