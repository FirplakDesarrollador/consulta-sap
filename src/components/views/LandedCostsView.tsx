'use client';

import React, { useState } from 'react';
import { useSapQuery } from '@/lib/useSapQuery';
import { Calculator, Filter, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, Eye, X, Plus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { LandedCostRow } from '@/types/sapBusiness';
import { LandedCostDetailModal } from '../modals/LandedCostDetailModal';
import { LandedCostFormModal } from '../modals/LandedCostFormModal';

interface Props {
  globalFilter?: string;
  refreshKey?: number;
}

/** Compras: Precios de Entrega (OIPF - LandedCosts del Service Layer) */
export const LandedCostsView: React.FC<Props> = ({ globalFilter = '', refreshKey = 0 }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState(globalFilter);
  const [status, setStatus] = useState('ALL');
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  const [tempSearch, setTempSearch] = useState(globalFilter);
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setSearch(globalFilter);
    setTempSearch(globalFilter);
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (search) params.set('search', search);
  if (status !== 'ALL') params.set('status', status);
  const listUrl = `/api/sap/landed-costs?${params.toString()}`;
  const query = useSapQuery<LandedCostRow[]>(listUrl, [refreshKey, tick]);
  const rows = Array.isArray(query.data) ? query.data : [];
  const isLoading = query.isLoading;
  const error = query.error;
  const hasMore = Boolean(query.json?.hasMore);
  const writesEnabled = query.json ? Boolean(query.json.writesEnabled) : null;

  const apply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setSearch(tempSearch);
    setPage(1);
  };

  const clear = () => {
    setTempStart('');
    setTempEnd('');
    setTempSearch('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setStatus('ALL');
    setPage(1);
  };

  const reload = () => setTick((t) => t + 1);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600 text-white">
              <Calculator className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Compras: Precios de Entrega (OIPF - SAP Service Layer)</h2>
            {writesEnabled !== null && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  writesEnabled ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {writesEnabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {writesEnabled ? 'Escritura habilitada' : 'Escritura deshabilitada (solo simulación)'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Costos de importación asignados a entradas de mercancía (LandedCosts)</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold">
          <Plus className="h-4 w-4" /> Nuevo Precio de Entrega
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="break-all">{error}</div>
          </div>
          <button onClick={reload} className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      <form onSubmit={apply} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="h-4 w-4 text-violet-600" />
          <span>Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar (N°, agente, expediente, referencia)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={tempSearch} onChange={(e) => setTempSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Desde</label>
            <input type="date" value={tempStart} onChange={(e) => setTempStart(e.target.value)} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasta</label>
            <input type="date" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
            >
              <option value="ALL">Todos</option>
              <option value="Abierto">Abiertos</option>
              <option value="Cerrado">Cerrados</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-1.5">
            <button type="submit" className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold">
              Buscar
            </button>
            {(tempStart || tempEnd || tempSearch || status !== 'ALL') && (
              <button type="button" onClick={clear} className="p-2 border border-slate-300 rounded-xl text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 border border-slate-300 rounded-lg"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <span className="text-slate-500">
            Página <strong className="font-mono text-slate-900">{page}</strong> • {rows.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                <th className="py-3.5 px-4">N° SAP</th>
                <th className="py-3.5 px-4">Agente / Proveedor</th>
                <th className="py-3.5 px-4">Expediente</th>
                <th className="py-3.5 px-4">Referencia</th>
                <th className="py-3.5 px-4">Contabilización</th>
                <th className="py-3.5 px-4 text-right">Total costos</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4">Comentarios</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-violet-600 mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">No se encontraron precios de entrega.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r.docEntry)} className="hover:bg-violet-50/50 cursor-pointer">
                    <td className="py-3.5 px-4 font-mono font-bold text-violet-700">{r.docNum}</td>
                    <td className="py-3.5 px-4 font-semibold">
                      {r.vendorName || '—'} <span className="font-mono text-slate-400 text-[10.5px]">{r.vendorCode}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{r.fileNumber || '—'}</td>
                    <td className="py-3.5 px-4 font-mono">{r.reference || '—'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{r.postingDate}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                      {r.currency} {r.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          r.status === 'Cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate" title={r.remarks}>
                      {r.remarks || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r.docEntry);
                        }}
                        className="p-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button onClick={() => setPage(1)} disabled={page === 1 || isLoading} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1">
            <ChevronsLeft className="h-3.5 w-3.5" /> Inicio
          </button>
          <button onClick={() => setPage(page - 1)} disabled={page === 1 || isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span className="px-3 py-1 bg-slate-200/80 rounded-lg font-mono font-bold">Pág. {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={!hasMore || isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 text-violet-700">
            Siguiente <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {selected !== null && <LandedCostDetailModal key={selected} docEntry={selected} onClose={() => setSelected(null)} onChanged={reload} />}
      {showCreate && <LandedCostFormModal onClose={() => setShowCreate(false)} onCreated={reload} />}
    </div>
  );
};
