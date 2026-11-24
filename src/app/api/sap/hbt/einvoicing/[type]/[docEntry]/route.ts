import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { slErrorResponse } from '@/lib/purchasing';
import { fetchFieldDefs, HBT_DOC_TYPES, HBT_UDF_PREFIX, mapEInvoiceRow, parseDocType, pickHbtFields, SapRecord } from '@/lib/hbt';

/**
 * GET /api/sap/hbt/einvoicing/[type]/[docEntry]
 * Detalle de facturación electrónica de un documento: todos los campos U_HBT_* (UserFieldsMD del documento) con sus etiquetas
 * y valores válidos. Los campos con credenciales no se piden. SOLO LECTURA (sin PATCH/POST/DELETE para documentos).
 */
type Ctx = { params: Promise<{ type: string; docEntry: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { type: rawType, docEntry: rawEntry } = await ctx.params;
  const type = parseDocType(rawType);
  if (!type) return NextResponse.json({ success: false, error: `Tipo de documento desconocido: ${rawType}` }, { status: 400 });
  if (!/^\d{1,9}$/.test(rawEntry)) return NextResponse.json({ success: false, error: 'DocEntry inválido' }, { status: 400 });
  const dt = HBT_DOC_TYPES[type];

  const f = await fetchFieldDefs(dt.table, HBT_UDF_PREFIX);
  if (!f) return NextResponse.json({ success: false, error: `No se pudo leer la definición de campos HBT de ${dt.table} (UserFieldsMD)` }, { status: 502 });

  const res = await querySapServiceLayer<SapRecord>(`${dt.entity}(${Number(rawEntry)})`, {
    method: 'GET',
    params: {
      $select: ['DocEntry', 'DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocCurrency', 'Cancelled', ...f.defs.filter((d) => !d.secret).map((d) => d.sap)].join(',')
    }
  });
  if (!res.success || !res.data) {
    if (res.error && !/HTTP 404/.test(res.error)) return slErrorResponse(res.error, 'No se pudo consultar el documento');
    return NextResponse.json({ success: false, error: `No se encontró el documento ${rawEntry} en ${dt.label}` }, { status: 404 });
  }
  const { fields, hidden } = pickHbtFields(f.defs, res.data);
  return NextResponse.json({
    success: true,
    readOnly: true,
    type,
    typeLabel: dt.label,
    data: { ...mapEInvoiceRow(res.data), fields, hiddenFields: hidden },
    fieldDefs: f.defs.filter((d) => !d.secret),
    timestamp: new Date().toISOString()
  });
}
