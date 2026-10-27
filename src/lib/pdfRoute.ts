import { NextResponse } from 'next/server';
import { PdfSourceId, resolveDocumentPdf } from '@/lib/fePdf';
import type { HbtDocType } from '@/types/hbt';

/** Respuesta común de las rutas /pdf: ?info=1 (JSON), ?download=1 (attachment), ?source=facture|sap-attachment */
export async function pdfResponse(request: Request, type: HbtDocType, rawEntry: string): Promise<NextResponse> {
  if (!/^\d{1,9}$/.test(rawEntry)) return NextResponse.json({ success: false, error: 'DocEntry inválido' }, { status: 400 });
  const sp = new URL(request.url).searchParams;
  const rawSource = sp.get('source');
  if (rawSource && !['auto', 'facture', 'sap-attachment'].includes(rawSource)) {
    return NextResponse.json({ success: false, error: 'source debe ser auto, facture o sap-attachment' }, { status: 400 });
  }
  const source = (rawSource || 'auto') as PdfSourceId | 'auto';
  const infoOnly = sp.get('info') === '1';

  const r = await resolveDocumentPdf(type, Number(rawEntry), { source, wantBody: !infoOnly });
  if (infoOnly) {
    if (!r.info) return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    return NextResponse.json({ success: true, data: r.info, timestamp: new Date().toISOString() });
  }
  if (!r.ok || !r.pdf) {
    return NextResponse.json({ success: false, error: r.error || 'No hay PDF disponible', info: r.info ?? null }, { status: r.status });
  }
  const disposition = sp.get('download') === '1' ? 'attachment' : 'inline';
  return new NextResponse(new Uint8Array(r.pdf.body), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(r.pdf.body.length),
      'Content-Disposition': `${disposition}; filename="${r.pdf.fileName}"`,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'X-Pdf-Source': r.pdf.source
    }
  });
}
