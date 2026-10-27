import { pdfResponse } from '@/lib/pdfRoute';

/**
 * GET /api/sap/invoices/[id]/pdf — PDF (representación gráfica) de una factura de venta.
 * [id] = DocEntry (el mismo `docEntry` que devuelve /api/sap/invoices/[id]).
 * Query: ?info=1 (JSON con las fuentes disponibles) · ?download=1 (attachment) · ?source=auto|facture|sap-attachment
 * Sirve application/pdf con Content-Disposition inline para incrustarlo en <iframe>/<object>. Solo GET.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return pdfResponse(request, 'invoices', id.replace(/^INV-/, '').trim());
}
