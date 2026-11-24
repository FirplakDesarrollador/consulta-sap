'use client';

import React, { useState } from 'react';
import { Search, Filter, RefreshCw, Download, Lock, X, FileText } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { money } from '@/lib/comprasApi';
import { HbtDocType, HbtEInvoiceRow, HbtEInvoiceSummary, HbtFieldDef, HbtValue } from '@/types/hbt';
import { downloadCsv, ErrorBox, hbtCardCls, hbtInputCls, Pager, ValueText } from './hbtUi';
import { DocumentPdfPreview } from '../common/DocumentPdfPreview';

interface Props {
  refreshKey?: number;
  globalFilter?: string;
}

const TYPES: { id: HbtDocType; label: string }[] = [
  { id: 'invoices', label: 'Facturas de venta' },
  { id: 'credit-notes', label: 'Notas crédito de venta' },
  { id: 'purchase-invoices', label: 'Facturas de compra' },
  { id: 'purchase-credit-notes', label: 'Notas crédito de compra' },
  { id: 'delivery-notes', label: 'Entregas' }
];

const STATUS_TONE: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700 border-slate-200',
  2: 'bg-sky-50 text-sky-700 border-sky-200',
  3: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  5: 'bg-rose-50 text-rose-700 border-rose-200'
};

const StatusPill: React.FC<{ code: number | null; label: string }> = ({ code, label }) => (
  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${code !== null ? STATUS_TONE[code] ?? STATUS_TONE[1] : 'bg-white text-slate-400 border-slate-200'}`}>{label}</span>
);

interface DetailPayload extends HbtEInvoiceRow {
  fields: Record<string, HbtValue>;
  hiddenFields: string[];
}

/** Estado de facturación electrónica de los documentos (U_HBT_EstadoCE, DIAN, entrega…). Solo lectura: el envío lo hace el complemento HBT */
export const HbtEInvoicingView: React.FC<Props> = ({ refreshKey = 0, globalFilter = '' }) => {
  const [type, setType] = useState<HbtDocType>('invoices');
  const [draft, setDraft] = useState({ search: globalFilter, from: '', to: '' });
  const [applied, setApplied] = useState({ search: globalFilter, from: '', to: '', status: '' });
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [selected, setSelected] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<'fields' | 'pdf'>('fields');
  const [reloadTick, setReloadTick] = useState(0);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setDraft((d) => ({ ...d, search: globalFilter }));
    setApplied((d) => ({ ...d, search: globalFilter }));
    setPage(1);
  }

  const dateQs = new URLSearchParams();
  if (applied.from) dateQs.set('from', applied.from);
  if (applied.to) dateQs.set('to', applied.to);
  const sumQ = useSapQuery<HbtEInvoiceSummary>(`/api/sap/hbt/einvoicing/summary?type=${type}&${dateQs.toString()}`, [refreshKey, reloadTick]);

  const params = new URLSearchParams({ type, page: String(page), limit: String(limit) });
  if (applied.search) params.set('search', applied.search);
  if (applied.status) params.set('status', applied.status);
  if (applied.from) params.set('from', applied.from);
  if (applied.to) params.set('to', applied.to);
  const listQ = useSapQuery<HbtEInvoiceRow[]>(`/api/sap/hbt/einvoicing?${params.toString()}`, [refreshKey, reloadTick]);
  const rows = Array.isArray(listQ.data) ? listQ.data : [];
  const total = typeof listQ.json?.total === 'number' ? (listQ.json.total as number) : null;
  const legend = (listQ.json?.legend as { dian: Record<string, string>; delivery: Record<string, string> } | undefined) ?? { dian: {}, delivery: {} };
  const reload = () => setReloadTick((t) => t + 1);

  const detailQ = useSapQuery<DetailPayload>(selected !== null ? `/api/sap/hbt/einvoicing/${type}/${selected}` : null, []);
  const detailDefs = (detailQ.json?.fieldDefs as HbtFieldDef[] | undefined) ?? [];

  const openDetail = (docEntry: number, tab: 'fields' | 'pdf') => {
    setDetailTab(tab);
    setSelected(docEntry);
  };

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    setApplied((a) => ({ ...a, search: draft.search.trim(), from: draft.from, to: draft.to }));
    setPage(1);
  };
  const clear = () => {
    setDraft({ search: '', from: '', to: '' });
    setApplied({ search: '', from: '', to: '', status: '' });
    setPage(1);
  };
  const pickStatus = (code: string) => {
    setApplied((a) => ({ ...a, status: a.status === code ? '' : code }));
    setPage(1);
  };
  const changeType = (t: HbtDocType) => {
    setType(t);
    setPage(1);
    setSelected(null);
    setApplied((a) => ({ ...a, status: '' }));
  };
  const typeLabel = TYPES.find((t) => t.id === type)?.label ?? type;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">Facturación electrónica · estado ante la DIAN</h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <Lock className="h-3 w-3" /> Solo lectura: el envío y reintento los realiza el complemento HBT
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => changeType(t.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${type === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className={`${hbtCardCls} !p-3`}>
          <div className="text-[11px] font-bold text-slate-500">Total {applied.from || applied.to ? '(rango)' : ''}</div>
          <div className="text-lg font-extrabold text-slate-900">{sumQ.data ? sumQ.data.total.toLocaleString('es-ES') : sumQ.isLoading ? '…' : '—'}</div>
        </div>
        {(sumQ.data?.byStatus ?? [1, 2, 3, 4, 5].map((c) => ({ code: c, label: '', count: -1 }))).map((s) => (
          <button
            key={s.code}
            onClick={() => pickStatus(String(s.code))}
            className={`${hbtCardCls} !p-3 text-left hover:border-indigo-300 ${applied.status === String(s.code) ? '!border-indigo-500 ring-2 ring-indigo-500/20' : ''}`}
          >
            <div className="text-[11px] font-bold text-slate-500">{s.label || 'Estado'}</div>
            <div className="text-lg font-extrabold text-slate-900">{s.count >= 0 ? s.count.toLocaleString('es-ES') : sumQ.isLoading ? '…' : '—'}</div>
          </button>
        ))}
      </div>
      <ErrorBox message={sumQ.error} />

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={draft.search} onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))} placeholder="N.º de documento, código o nombre del socio" className={`${hbtInputCls} pl-8`} />
          </div>
        </div>
        <div className="w-40">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Desde</label>
          <input type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className={hbtInputCls} />
        </div>
        <div className="w-40">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasta</label>
          <input type="date" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className={hbtInputCls} />
        </div>
        <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Aplicar
        </button>
        <button type="button" onClick={clear} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold">
          Limpiar
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={reload} className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100" aria-label="Recargar">
            <RefreshCw className={`h-3.5 w-3.5 ${listQ.isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `HBT_FE_${type}_pagina_${page}.csv`,
                ['DocEntry', 'DocNum', 'Fecha', 'Socio', 'Nombre', 'Total', 'Estado', 'Detalle', 'Envio', 'Respuesta', 'CodigoRespuesta'],
                rows.map((r) => [r.docEntry, r.docNum, r.docDate, r.cardCode, r.cardName, r.docTotal, r.statusLabel, r.statusDetail, r.sentDate, r.answerDate, r.responseCode])
              )
            }
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </form>
      {applied.status && (
        <div className="text-xs text-slate-600">
          Filtrando por estado <b>{sumQ.data?.byStatus.find((s) => String(s.code) === applied.status)?.label ?? applied.status}</b>{' '}
          <button onClick={() => pickStatus(applied.status)} className="text-indigo-700 font-bold hover:underline">
            quitar
          </button>
        </div>
      )}

      <ErrorBox message={listQ.error} />

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['N.º', 'Fecha', 'Socio', 'Total', 'Estado FE', 'DIAN', 'Entrega', 'Enviado', 'Respuesta', 'Cód.', 'PDF'].map((h) => (
                <th key={h} className="text-left font-bold px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listQ.isLoading && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                  Consultando SAP…
                </td>
              </tr>
            )}
            {!listQ.isLoading && rows.length === 0 && !listQ.error && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                  Sin documentos para los filtros indicados
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.docEntry} onClick={() => openDetail(r.docEntry, 'fields')} className="hover:bg-indigo-50/50 cursor-pointer">
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                  {r.docNum}
                  {r.cancelled && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">anulado</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.docDate}</td>
                <td className="px-3 py-2 max-w-[240px] truncate" title={`${r.cardCode} · ${r.cardName}`}>
                  <span className="font-mono text-slate-500">{r.cardCode}</span> {r.cardName}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{money(r.docTotal)}</td>
                <td className="px-3 py-2"><StatusPill code={r.statusCode} label={r.statusLabel} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{r.dianCode === null ? '—' : legend.dian[String(r.dianCode)] ?? r.dianCode}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.deliveryCode === null ? '—' : legend.delivery[String(r.deliveryCode)] ?? r.deliveryCode}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.sentDate || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.answerDate || '—'}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{r.responseCode || '—'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(r.docEntry, 'pdf');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 text-[11px] font-bold text-slate-700"
                    title="Vista previa del PDF"
                  >
                    <FileText className="h-3 w-3" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasMore={Boolean(listQ.json?.hasMore)} total={total} count={rows.length} limit={limit} onPage={setPage} />

      {selected !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className={`w-full ${detailTab === 'pdf' ? 'max-w-5xl' : 'max-w-3xl'} max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {typeLabel} · {detailQ.data ? detailQ.data.docNum : selected}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Campos HBT del documento · solo lectura</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1 px-5 pt-2 border-b border-slate-200 text-xs font-bold">
              {([['fields', 'Campos HBT'], ['pdf', 'PDF del documento']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setDetailTab(id)}
                  className={`px-3 py-2 border-b-2 -mb-px ${detailTab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {detailTab === 'pdf' && (
              <div className="p-5 overflow-y-auto">
                <DocumentPdfPreview key={`${type}-${selected}`} pdfBase={`/api/sap/hbt/einvoicing/${type}/${selected}/pdf`} />
              </div>
            )}
            <div className={`p-5 overflow-y-auto space-y-4 ${detailTab === 'pdf' ? 'hidden' : ''}`}>
              {detailQ.isLoading && <p className="text-xs text-slate-500">Consultando SAP…</p>}
              <ErrorBox message={detailQ.error} />
              {detailQ.data && (
                <>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 grid grid-cols-2 gap-1">
                    <div><b>Fecha:</b> {detailQ.data.docDate}</div>
                    <div><b>Total:</b> {money(detailQ.data.docTotal)} {detailQ.data.currency}</div>
                    <div className="col-span-2"><b>Socio:</b> {detailQ.data.cardCode} · {detailQ.data.cardName}</div>
                    <div><b>Estado FE:</b> <StatusPill code={detailQ.data.statusCode} label={detailQ.data.statusLabel} /></div>
                    <div><b>Anulado:</b> {detailQ.data.cancelled ? 'Sí' : 'No'}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {detailDefs
                      .filter((d) => {
                        const v = detailQ.data!.fields[d.name];
                        return v !== null && v !== undefined && v !== '';
                      })
                      .map((d) => (
                        <div key={d.name} className="min-w-0">
                          <div className="text-[10.5px] font-bold text-slate-500">
                            {d.label} <span className="font-mono font-medium text-slate-400">{d.name}</span>
                          </div>
                          <div className="text-xs text-slate-800"><ValueText def={d} value={detailQ.data!.fields[d.name]} /></div>
                        </div>
                      ))}
                  </div>
                  <p className="text-[11px] text-slate-500">Solo se muestran los campos HBT con valor. {detailQ.data.hiddenFields.length > 0 && `Campos protegidos no mostrados: ${detailQ.data.hiddenFields.join(', ')}.`}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
