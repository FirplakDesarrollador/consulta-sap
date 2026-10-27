import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import { executeWrite, guardWrite, sapWritesEnabled, slErrorResponse, validationErrorResponse } from '@/lib/purchasing';
import { buildFieldsUpdate, fetchFieldDefs, HBT_UDF_PREFIX, parseHbtCode, partnerDenied, partnerPath, pickHbtFields, SapRecord } from '@/lib/hbt';
import { HbtPartnerDetail } from '@/types/hbt';

/**
 * /api/sap/hbt/partners/[code]
 * GET   → socio de negocio con todos sus campos HBT, valores válidos y las retenciones asignadas (BPWithholdingTaxCollection).
 * PATCH → { fields: { HBT_Campo: valor } } actualización diferencial de campos U_HBT_* del socio (el resto del socio no se toca).
 *         HBT_TareaSN_TPV y HBT_ActualizaMP son banderas del proceso del complemento: solo lectura.
 * PUT   → alias de PATCH. Escrituras: ?dryRun=1 y SAP_ALLOW_WRITES=true.
 */
type Ctx = { params: Promise<{ code: string }> };

async function defsOrError() {
  const f = await fetchFieldDefs('OCRD', HBT_UDF_PREFIX);
  if (!f) return { error: NextResponse.json({ success: false, error: 'No se pudo leer la definición de campos HBT de socios (UserFieldsMD)' }, { status: 502 }) };
  return { defs: f.defs };
}

function notFound(code: string, error?: string) {
  if (error && !/HTTP 404/.test(error)) return slErrorResponse(error, `No se pudo consultar el socio ${code}`);
  return NextResponse.json({ success: false, error: `No se encontró el socio ${code}` }, { status: 404 });
}

export async function GET(_request: Request, ctx: Ctx) {
  const code = parseHbtCode((await ctx.params).code);
  if (!code) return NextResponse.json({ success: false, error: 'Código de socio inválido' }, { status: 400 });
  const d = await defsOrError();
  if ('error' in d) return d.error;

  const res = await querySapServiceLayer<SapRecord>(partnerPath(code), {
    method: 'GET',
    params: {
      $select: ['CardCode', 'CardName', 'CardType', 'FederalTaxID', 'Valid', 'Frozen', 'SubjectToWithholdingTax', 'WTCode', 'BPWithholdingTaxCollection', ...d.defs.filter((x) => !x.secret).map((x) => x.sap)].join(',')
    }
  });
  if (!res.success || !res.data) return notFound(code, res.error);
  const o = res.data;
  const { fields, hidden } = pickHbtFields(d.defs, o);
  const wt = Array.isArray(o.BPWithholdingTaxCollection) ? (o.BPWithholdingTaxCollection as SapRecord[]).map((w) => String(w.WTCode ?? '')).filter(Boolean) : [];
  const data: HbtPartnerDetail = {
    cardCode: String(o.CardCode ?? ''),
    cardName: String(o.CardName ?? ''),
    cardType: String(o.CardType ?? ''),
    federalTaxId: String(o.FederalTaxID ?? ''),
    active: o.Valid !== 'tNO' && o.Frozen !== 'tYES',
    fields,
    subjectToWithholding: String(o.SubjectToWithholdingTax ?? ''),
    defaultWtCode: String(o.WTCode ?? ''),
    withholdingCodes: wt,
    hiddenFields: hidden
  };
  return NextResponse.json({
    success: true,
    writesEnabled: sapWritesEnabled(),
    data,
    fieldDefs: d.defs.filter((x) => !x.secret).map((x) => ({ ...x, readOnly: partnerDenied(x) !== null })),
    timestamp: new Date().toISOString()
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const code = parseHbtCode((await ctx.params).code);
  if (!code) return NextResponse.json({ success: false, error: 'Código de socio inválido' }, { status: 400 });
  const d = await defsOrError();
  if ('error' in d) return d.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(['El cuerpo debe ser JSON válido']);
  }
  const v = buildFieldsUpdate(body, d.defs, partnerDenied);
  if (!v.ok || !v.value) return validationErrorResponse(v.errors);

  const plan = { method: 'PATCH' as const, path: partnerPath(code), body: v.value, description: `Actualizar campos HBT del socio ${code}` };
  const st = await querySapServiceLayer<SapRecord>(partnerPath(code), { method: 'GET', params: { $select: 'CardCode' } });
  if (!st.success) return notFound(code, st.error);

  const blocked = guardWrite(request, plan);
  if (blocked) return blocked;

  const result = await executeWrite(plan);
  if (!result.success) return slErrorResponse(result.error, `No se pudo actualizar el socio ${code}`);
  return NextResponse.json({ success: true, message: `Campos HBT del socio ${code} actualizados en SAP` });
}

export const PUT = PATCH;
