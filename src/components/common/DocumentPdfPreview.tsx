'use client';

import React, { useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';

interface PdfSource {
  id: 'facture' | 'sap-attachment';
  label: string;
  available: boolean;
  fileName?: string;
  reason?: string;
}
interface PdfInfo {
  docNum: number | null;
  viewerUrl: string | null;
  sources: PdfSource[];
  preferred: PdfSource['id'] | null;
}

/**
 * Vista previa incrustada del PDF de un documento + descargar / abrir en pestaña nueva.
 * `pdfBase` es una ruta /pdf (p. ej. /api/sap/invoices/<DocEntry>/pdf) que sirve application/pdf inline.
 */
export const DocumentPdfPreview: React.FC<{ pdfBase: string; heightClass?: string }> = ({ pdfBase, heightClass = 'h-[68vh]' }) => {
  const [forced, setForced] = useState<PdfSource['id'] | null>(null);
  const infoQ = useSapQuery<PdfInfo>(`${pdfBase}?info=1`, []);
  const info = infoQ.data;
  const source = forced ?? info?.preferred ?? null;
  const qs = source ? `source=${source}` : '';
  const viewUrl = source ? `${pdfBase}?${qs}` : null;
  const downloadUrl = source ? `${pdfBase}?${qs}&download=1` : null;
  // '#' parámetros del visor nativo del navegador (ajustar al ancho, sin panel de miniaturas)
  const embedUrl = viewUrl ? `${viewUrl}#view=FitH&navpanes=0` : null;
  const unusableAttachment = info?.sources.find((s) => s.id === 'sap-attachment' && s.available && info.preferred !== 'sap-attachment');

  return (
    <div className="space-y-3">
      {infoQ.isLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin" /> Buscando el PDF de la factura…
        </div>
      )}
      {infoQ.error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span className="break-words">{infoQ.error}</span>
        </div>
      )}

      {info && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {viewUrl && downloadUrl && (
              <>
                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña nueva
                </a>
                <a href={downloadUrl} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Download className="h-3.5 w-3.5" /> Descargar PDF
                </a>
              </>
            )}
            {info.viewerUrl && (
              <a href={info.viewerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700" title="El visor de Facture no se puede incrustar (X-Frame-Options); se abre en otra pestaña">
                <FileText className="h-3.5 w-3.5" /> Visor Facture
              </a>
            )}
            {unusableAttachment && forced !== 'sap-attachment' && (
              <button onClick={() => setForced('sap-attachment')} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2">
                Ver primer adjunto de SAP ({unusableAttachment.fileName})
              </button>
            )}
            {forced && (
              <button onClick={() => setForced(null)} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2">
                Volver a la fuente automática
              </button>
            )}
            {source && (
              <span className="text-[11px] text-slate-500 ml-auto">
                Fuente: {info.sources.find((s) => s.id === source)?.label}
                {info.sources.find((s) => s.id === source)?.fileName ? ` · ${info.sources.find((s) => s.id === source)?.fileName}` : ''}
              </span>
            )}
          </div>

          {embedUrl ? (
            <object key={embedUrl} data={embedUrl} type="application/pdf" className={`w-full ${heightClass} rounded-xl border border-slate-200 bg-slate-100`}>
              <iframe src={embedUrl} title="Vista previa PDF" className={`w-full ${heightClass} rounded-xl border border-slate-200`} />
            </object>
          ) : (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> No hay un PDF disponible para este documento
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {info.sources.map((s) => (
                  <li key={s.id}>
                    <b>{s.label}:</b> {s.available ? 'disponible' : s.reason || 'no disponible'}
                    {s.available && s.reason ? ` (${s.reason})` : ''}
                  </li>
                ))}
              </ul>
              <p>La representación gráfica la genera Facture al enviar el documento; si el documento aún está Pendiente/Generado, vuelva a intentarlo cuando se envíe.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
