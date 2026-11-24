import { NextResponse } from 'next/server';
import { parseDocType } from '@/lib/hbt';
import { pdfResponse } from '@/lib/pdfRoute';

/**
 * GET /api/sap/hbt/einvoicing/[type]/[docEntry]/pdf — mismo PDF que /api/sap/invoices/[id]/pdf, para cualquier tipo de documento FE
 * (facturas, notas crédito, entregas, compras). Solo GET.
 */
export async function GET(request: Request, ctx: { params: Promise<{ type: string; docEntry: string }> }) {
  const { type: rawType, docEntry } = await ctx.params;
  const type = parseDocType(rawType);
  if (!type) return NextResponse.json({ success: false, error: `Tipo de documento desconocido: ${rawType}` }, { status: 400 });
  return pdfResponse(request, type, docEntry);
}
