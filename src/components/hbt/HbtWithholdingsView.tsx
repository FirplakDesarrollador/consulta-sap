'use client';

import React, { useState } from 'react';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtFieldDef, HbtWithholdingRow } from '@/types/hbt';
import { HbtEditModal } from './HbtEditModal';
import { displayValue, downloadCsv, ErrorBox, hbtInputCls, Pager, WritesBadge } from './hbtUi';

interface Props {
  refreshKey?: number;
  globalFilter?: string;
}

interface Filters {
  search: string;
  inactive: string;
  tipRet: string;
  afecta: string;
}
const EMPTY: Filters = { search: '', inactive: '0', tipRet: '', afecta: '' };

const WT_CATEGORY: Record<string, string> = { wtcc_Invoice: 'Factura', wtcc_Payment: 'Pago' };
const WT_TYPE: Record<string, string> = {
  wt_IncomeTaxWithholding: 'Renta',
  wt_VatWithholding: 'IVA',
  wt_Other: 'Otra',
  wt_StampDuty: 'Timbre',
  wt_WithholdingTaxOnPayroll: 'Nómina'
};
const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 4 }));

/** Códigos de retención (OWHT) con sus campos HBT: tipo de retención, base mínima, afectación, municipio, actividad económica… */
export const HbtWithholdingsView: React.FC<Props> = ({ refreshKey = 0, globalFilter = '' }) => {
  const [draft, setDraft] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [selected, setSelected] = useState<HbtWithholdingRow | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setDraft((d) => ({ ...d, search: globalFilter }));
    setApplied((d) => ({ ...d, search: globalFilter }));
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit), inactive: applied.inactive });
  if (applied.search) params.set('search', applied.search);
  if (applied.tipRet) params.set('f.HBT_TipRet', applied.tipRet);
  if (applied.afecta) params.set('f.HBT_Afecta', applied.afecta);
  const listQ = useSapQuery<HbtWithholdingRow[]>(`/api/sap/hbt/withholdings?${params.toString()}`, [refreshKey, reloadTick]);
  const rows = Array.isArray(listQ.data) ? listQ.data : [];
  const defs = (listQ.json?.fieldDefs as HbtFieldDef[] | undefined) ?? [];
  const defOf = (n: string) => defs.find((d) => d.name === n);
  const total = typeof listQ.json?.total === 'number' ? (listQ.json.total as number) : null;
  const writesEnabled = listQ.json ? Boolean(listQ.json.writesEnabled) : null;
  const reload = () => setReloadTick((t) => t + 1);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    setApplied({ ...draft, search: draft.search.trim() });
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };
  const tipRet = defOf('HBT_TipRet');
  const afecta = defOf('HBT_Afecta');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">Retenciones · parametrización HBT</h3>
        <span className="text-[11px] font-semibold text-slate-500">WithholdingTaxCodes · solo se editan campos U_HBT_*; no se crean ni eliminan códigos</span>
        <WritesBadge enabled={writesEnabled} />
      </div>

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={draft.search} onChange={(e) => set('search', e.target.value)} placeholder="Código o nombre" className={`${hbtInputCls} pl-8`} />
          </div>
        </div>
        <div className="w-32">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado</label>
          <select value={draft.inactive} onChange={(e) => set('inactive', e.target.value)} className={hbtInputCls}>
            <option value="0">Activas</option>
            <option value="1">Inactivas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de retención</label>
          <select value={draft.tipRet} onChange={(e) => set('tipRet', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            {(tipRet?.validValues ?? []).map((v) => (
              <option key={v.value} value={v.value}>
                {v.value === v.label ? v.value : `${v.value} · ${v.label}`}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Afecta</label>
          <select value={draft.afecta} onChange={(e) => set('afecta', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            {(afecta?.validValues ?? []).map((v) => (
              <option key={v.value} value={v.value}>
                {v.value === v.label ? v.value : `${v.value} · ${v.label}`}
              </option>
            ))}
          </select>
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
                `HBT_Retenciones_pagina_${page}.csv`,
                ['Codigo', 'Nombre', 'Categoria', 'Tipo', 'Tasa', 'Base', 'Cuenta', 'Inactiva', ...defs.map((d) => d.name)],
                rows.map((r) => [r.wtCode, r.wtName, r.category, r.withholdingType, r.rate, r.baseAmount, r.account, r.inactive ? 'Sí' : 'No', ...defs.map((d) => r.fields[d.name])])
              )
            }
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </form>

      <ErrorBox message={listQ.error} />

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['Código', 'Nombre', 'Categoría', 'Tipo SAP', 'Tasa', 'Base', 'Cuenta', 'Tipo ret. HBT', 'Afecta', 'Base mínima'].map((h) => (
                <th key={h} className="text-left font-bold px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listQ.isLoading && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                  Consultando SAP…
                </td>
              </tr>
            )}
            {!listQ.isLoading && rows.length === 0 && !listQ.error && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                  Sin retenciones para los filtros indicados
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.wtCode} onClick={() => setSelected(r)} className="hover:bg-indigo-50/50 cursor-pointer">
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                  {r.wtCode}
                  {r.inactive && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">inactiva</span>}
                </td>
                <td className="px-3 py-2 max-w-[280px] truncate" title={r.wtName}>{r.wtName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{WT_CATEGORY[r.category] ?? r.category}</td>
                <td className="px-3 py-2 whitespace-nowrap">{WT_TYPE[r.withholdingType] ?? r.withholdingType}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{num(r.rate)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{num(r.baseAmount)}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{r.account || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{displayValue(tipRet, r.fields['HBT_TipRet'])}</td>
                <td className="px-3 py-2 whitespace-nowrap">{displayValue(afecta, r.fields['HBT_Afecta'])}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{r.fields['HBT_BasMin'] === null || r.fields['HBT_BasMin'] === undefined ? '—' : Number(r.fields['HBT_BasMin']).toLocaleString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasMore={Boolean(listQ.json?.hasMore)} total={total} count={rows.length} limit={limit} onPage={setPage} />
      <p className="text-[11px] text-slate-500">Tasa y Base se muestran tal como las entrega SAP (Rate / BaseAmount); no se editan desde esta pantalla.</p>

      {selected && (
        <HbtEditModal
          key={selected.wtCode}
          title={`${selected.wtCode} · ${selected.wtName}`}
          subtitle="Retención · solo se editan campos U_HBT_*"
          variant="fields"
          defs={defs}
          initial={selected.fields}
          writeUrl={`/api/sap/hbt/withholdings/${encodeURIComponent(selected.wtCode)}`}
          warning="La tasa, la base y la cuenta contable de la retención no se modifican desde aquí; solo la parametrización HBT (medios magnéticos, certificados, afectación)."
          extra={
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 grid grid-cols-2 gap-1">
              <div><b>Categoría:</b> {WT_CATEGORY[selected.category] ?? selected.category}</div>
              <div><b>Tipo SAP:</b> {WT_TYPE[selected.withholdingType] ?? selected.withholdingType}</div>
              <div><b>Tasa:</b> {num(selected.rate)}</div>
              <div><b>Base:</b> {num(selected.baseAmount)}</div>
              <div><b>Cuenta:</b> {selected.account || '—'}</div>
              <div><b>Vigente desde:</b> {selected.effectiveFrom || '—'}</div>
              <div><b>Código oficial:</b> {selected.officialCode || '—'}</div>
              <div><b>Estado:</b> {selected.inactive ? 'Inactiva' : 'Activa'}</div>
            </div>
          }
          onClose={() => setSelected(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
};
