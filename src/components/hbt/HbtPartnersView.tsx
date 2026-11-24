'use client';

import React, { useState } from 'react';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtFieldDef, HbtPartnerDetail, HbtPartnerRow } from '@/types/hbt';
import { HbtEditModal, HbtModalField } from './HbtEditModal';
import { displayValue, downloadCsv, ErrorBox, hbtInputCls, Pager, WritesBadge } from './hbtUi';

interface Props {
  refreshKey?: number;
  globalFilter?: string;
}

const TYPE_LABEL: Record<string, string> = { cCustomer: 'Cliente', cSupplier: 'Proveedor', cLid: 'Lead' };
const COLS = ['HBT_RegTrib', 'HBT_TipDoc', 'HBT_MunMed', 'HBT_TipEnt', 'HBT_AutRet', 'HBT_InfoTrib', 'HBT_AplicaFel'];

interface Filters {
  search: string;
  type: string;
  status: string;
  regTrib: string;
  tipDoc: string;
  autRet: string;
  aplicaFel: string;
}
const EMPTY: Filters = { search: '', type: '', status: '', regTrib: '', tipDoc: '', autRet: '', aplicaFel: '' };

/** Información tributaria HBT de los socios de negocio (OCRD, campos U_HBT_*): régimen, tipo de documento, municipio, autorretenedor, FE… */
export const HbtPartnersView: React.FC<Props> = ({ refreshKey = 0, globalFilter = '' }) => {
  const [draft, setDraft] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setDraft((d) => ({ ...d, search: globalFilter }));
    setApplied((d) => ({ ...d, search: globalFilter }));
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (applied.search) params.set('search', applied.search);
  if (applied.type) params.set('type', applied.type);
  if (applied.status) params.set('status', applied.status);
  if (applied.regTrib) params.set('f.HBT_RegTrib', applied.regTrib);
  if (applied.tipDoc) params.set('f.HBT_TipDoc', applied.tipDoc);
  if (applied.autRet) params.set('f.HBT_AutRet', applied.autRet);
  if (applied.aplicaFel) params.set('f.HBT_AplicaFel', applied.aplicaFel);

  const listQ = useSapQuery<HbtPartnerRow[]>(`/api/sap/hbt/partners?${params.toString()}`, [refreshKey, reloadTick]);
  const rows = Array.isArray(listQ.data) ? listQ.data : [];
  const total = typeof listQ.json?.total === 'number' ? (listQ.json.total as number) : null;
  const writesEnabled = listQ.json ? Boolean(listQ.json.writesEnabled) : null;
  const reload = () => setReloadTick((t) => t + 1);

  const detailQ = useSapQuery<HbtPartnerDetail>(selected ? `/api/sap/hbt/partners/${encodeURIComponent(selected)}` : null, [reloadTick]);
  const fieldDefs = (detailQ.json?.fieldDefs as HbtModalField[] | undefined) ?? [];
  const defOf = (name: string): HbtFieldDef | undefined => fieldDefs.find((d) => d.name === name);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    setApplied({ ...draft, search: draft.search.trim(), regTrib: draft.regTrib.trim(), tipDoc: draft.tipDoc.trim() });
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  const headers: Record<string, string> = {
    HBT_RegTrib: 'Régimen trib.',
    HBT_TipDoc: 'Tipo doc.',
    HBT_MunMed: 'Municipio',
    HBT_TipEnt: 'Tipo entidad',
    HBT_AutRet: 'Autorret.',
    HBT_InfoTrib: 'Info. tributaria',
    HBT_AplicaFel: 'FE'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">Terceros · información tributaria HBT</h3>
        <span className="text-[11px] font-semibold text-slate-500">BusinessPartners · campos U_HBT_* · edición por PATCH</span>
        <WritesBadge enabled={writesEnabled} />
      </div>

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={draft.search} onChange={(e) => set('search', e.target.value)} placeholder="Código, nombre o NIT" className={`${hbtInputCls} pl-8`} />
          </div>
        </div>
        <div className="w-32">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo</label>
          <select value={draft.type} onChange={(e) => set('type', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            <option value="C">Clientes</option>
            <option value="S">Proveedores</option>
            <option value="L">Leads</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado</label>
          <select value={draft.status} onChange={(e) => set('status', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="w-28">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Régimen trib.</label>
          <input value={draft.regTrib} onChange={(e) => set('regTrib', e.target.value)} placeholder="ej. 02" className={`${hbtInputCls} font-mono`} />
        </div>
        <div className="w-28">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo doc.</label>
          <input value={draft.tipDoc} onChange={(e) => set('tipDoc', e.target.value)} placeholder="ej. 31" className={`${hbtInputCls} font-mono`} />
        </div>
        <div className="w-28">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Autorretenedor</label>
          <select value={draft.autRet} onChange={(e) => set('autRet', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            <option value="Y">Sí</option>
            <option value="N">No</option>
          </select>
        </div>
        <div className="w-28">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Aplica FE</label>
          <select value={draft.aplicaFel} onChange={(e) => set('aplicaFel', e.target.value)} className={hbtInputCls}>
            <option value="">Todos</option>
            <option value="Y">Sí</option>
            <option value="N">No</option>
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
                `HBT_Terceros_pagina_${page}.csv`,
                ['CardCode', 'Nombre', 'Tipo', 'NIT', 'Activo', ...COLS],
                rows.map((r) => [r.cardCode, r.cardName, TYPE_LABEL[r.cardType] ?? r.cardType, r.federalTaxId, r.active ? 'Sí' : 'No', ...COLS.map((c) => r.fields[c])])
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
              <th className="text-left font-bold px-3 py-2">Código</th>
              <th className="text-left font-bold px-3 py-2">Nombre</th>
              <th className="text-left font-bold px-3 py-2">Tipo</th>
              <th className="text-left font-bold px-3 py-2">NIT</th>
              {COLS.map((c) => (
                <th key={c} className="text-left font-bold px-3 py-2 whitespace-nowrap">
                  {headers[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listQ.isLoading && (
              <tr>
                <td colSpan={4 + COLS.length} className="px-3 py-6 text-center text-slate-500">
                  Consultando SAP…
                </td>
              </tr>
            )}
            {!listQ.isLoading && rows.length === 0 && !listQ.error && (
              <tr>
                <td colSpan={4 + COLS.length} className="px-3 py-6 text-center text-slate-500">
                  Sin socios para los filtros indicados
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.cardCode} onClick={() => setSelected(r.cardCode)} className="hover:bg-indigo-50/50 cursor-pointer">
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                  {r.cardCode}
                  {!r.active && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">inactivo</span>}
                </td>
                <td className="px-3 py-2 max-w-[260px] truncate" title={r.cardName}>{r.cardName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{TYPE_LABEL[r.cardType] ?? r.cardType}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{r.federalTaxId || '—'}</td>
                {COLS.map((c) => (
                  <td key={c} className="px-3 py-2 whitespace-nowrap">
                    {r.fields[c] === null || r.fields[c] === undefined || r.fields[c] === '' ? '—' : String(r.fields[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasMore={Boolean(listQ.json?.hasMore)} total={total} count={rows.length} limit={limit} onPage={setPage} />

      {selected && detailQ.data && (
        <HbtEditModal
          key={selected}
          title={`${detailQ.data.cardName || selected}`}
          subtitle={`${selected} · ${TYPE_LABEL[detailQ.data.cardType] ?? detailQ.data.cardType} · solo se editan campos U_HBT_*`}
          variant="fields"
          defs={fieldDefs}
          initial={detailQ.data.fields}
          writeUrl={`/api/sap/hbt/partners/${encodeURIComponent(selected)}`}
          warning="Estos campos los usan la facturación electrónica y los medios magnéticos del complemento HBT. El resto de datos del socio no se modifica desde aquí."
          extra={
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1">
              <div>
                <b>NIT:</b> {detailQ.data.federalTaxId || '—'} · <b>Estado:</b> {detailQ.data.active ? 'Activo' : 'Inactivo'}
              </div>
              <div>
                <b>Sujeto a retención:</b> {detailQ.data.subjectToWithholding === 'boYES' ? 'Sí' : detailQ.data.subjectToWithholding === 'boNO' ? 'No' : '—'}
                {detailQ.data.defaultWtCode && <> · <b>Código por defecto:</b> {detailQ.data.defaultWtCode}</>}
              </div>
              <div>
                <b>Retenciones asignadas:</b> {detailQ.data.withholdingCodes.length > 0 ? detailQ.data.withholdingCodes.join(', ') : 'ninguna'}
              </div>
              {detailQ.data.hiddenFields.length > 0 && (
                <div className="text-slate-500">Campos protegidos (no se muestran): {detailQ.data.hiddenFields.join(', ')}</div>
              )}
              <div className="text-slate-500">
                Régimen: {displayValue(defOf('HBT_RegTrib'), detailQ.data.fields['HBT_RegTrib'])} · Tipo doc.: {displayValue(defOf('HBT_TipDoc'), detailQ.data.fields['HBT_TipDoc'])}
              </div>
            </div>
          }
          onClose={() => setSelected(null)}
          onSaved={reload}
        />
      )}
      {selected && detailQ.error && !detailQ.isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-w-md w-full bg-white rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <ErrorBox message={detailQ.error} />
            <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};
