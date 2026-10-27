'use client';

import React, { useState } from 'react';
import { Search, Plus, RefreshCw, Download, Filter } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtFieldDef, HbtRecord, HbtTableSchema } from '@/types/hbt';
import { HbtEditModal } from './HbtEditModal';
import { displayValue, downloadCsv, ErrorBox, hbtInputCls, MODE_BADGE, Pager, WritesBadge } from './hbtUi';

interface Props {
  table: string;
  refreshKey?: number;
  /** Código inicial: restringe la lista a registros cuyo Code empieza por este valor (p. ej. departamento) */
  fixedPrefix?: string;
  /** Oculta la cabecera propia (cuando la vista que lo contiene ya la muestra) */
  compact?: boolean;
  /** Etiqueta para el botón "Nuevo" */
  newLabel?: string;
  /** Valor sugerido del prefijo del Code al crear (p. ej. código de departamento) */
  newCodeHint?: string;
}

const COLS = 6;

/**
 * Visor y editor genérico de una tabla de usuario de Localización HBT (entidad U_<TABLA>): lista paginada en el servidor,
 * búsqueda, filtro por campo y modal de creación / edición / eliminación según el modo de la tabla.
 */
export const HbtTableBrowser: React.FC<Props> = ({ table, refreshKey = 0, fixedPrefix = '', compact = false, newLabel = 'Nuevo registro', newCodeHint }) => {
  const [searchDraft, setSearchDraft] = useState('');
  const [prefixDraft, setPrefixDraft] = useState('');
  const [fieldDraft, setFieldDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');
  const [applied, setApplied] = useState({ search: '', prefix: '', field: '', value: '' });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [reloadTick, setReloadTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const schemaQ = useSapQuery<HbtTableSchema>(`/api/sap/hbt/tables/${encodeURIComponent(table)}/schema`, [refreshKey]);
  const schema = schemaQ.data;
  const defs = schema?.fields ?? [];
  const info = schema?.table;
  const shown = defs.filter((d) => !d.secret && d.kind !== 'longtext').slice(0, COLS);

  const params = new URLSearchParams({ page: String(page), limit: String(limit), order });
  if (applied.search) params.set('search', applied.search);
  const effPrefix = fixedPrefix || applied.prefix;
  if (effPrefix) params.set('prefix', effPrefix);
  if (applied.field && applied.value) params.set(`f.${applied.field}`, applied.value);
  const listUrl = schemaQ.isLoading || schemaQ.error ? null : `/api/sap/hbt/tables/${encodeURIComponent(table)}?${params.toString()}`;
  const listQ = useSapQuery<HbtRecord[]>(listUrl, [refreshKey, reloadTick]);
  const rows = Array.isArray(listQ.data) ? listQ.data : [];
  const total = typeof listQ.json?.total === 'number' ? (listQ.json.total as number) : null;
  const writesEnabled = listQ.json ? Boolean(listQ.json.writesEnabled) : null;
  const reload = () => setReloadTick((t) => t + 1);

  const detailQ = useSapQuery<HbtRecord>(selected ? `/api/sap/hbt/tables/${encodeURIComponent(table)}/${encodeURIComponent(selected)}` : null, [reloadTick]);

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    setApplied({ search: searchDraft.trim(), prefix: prefixDraft.trim(), field: fieldDraft, value: valueDraft.trim() });
    setPage(1);
  };
  const clear = () => {
    setSearchDraft('');
    setPrefixDraft('');
    setFieldDraft('');
    setValueDraft('');
    setApplied({ search: '', prefix: '', field: '', value: '' });
    setPage(1);
  };

  const mode = info?.mode ?? 'readonly';
  const canCreate = mode === 'crud' || mode === 'config';
  const filterable: HbtFieldDef[] = defs.filter((d) => !d.secret && d.kind !== 'longtext');
  const error = schemaQ.error || listQ.error;

  const exportCsv = () =>
    downloadCsv(
      `${table}_pagina_${page}.csv`,
      ['Code', 'Name', ...shown.map((d) => d.name)],
      rows.map((r) => [r.code, r.name, ...shown.map((d) => r.fields[d.name])])
    );

  return (
    <div className="space-y-4">
      {!compact && info && (
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">
            {info.description} <span className="font-mono text-xs font-semibold text-slate-500">@{info.name}</span>
          </h3>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${MODE_BADGE[mode].cls}`}>{MODE_BADGE[mode].label}</span>
          <WritesBadge enabled={writesEnabled} />
        </div>
      )}
      {compact && <div className="flex justify-end"><WritesBadge enabled={writesEnabled} /></div>}

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Código, nombre o campos de texto" className={`${hbtInputCls} pl-8`} />
          </div>
        </div>
        {!fixedPrefix && (
          <div className="w-32">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Código empieza por</label>
            <input value={prefixDraft} onChange={(e) => setPrefixDraft(e.target.value)} className={`${hbtInputCls} font-mono`} />
          </div>
        )}
        {filterable.length > 0 && (
          <>
            <div className="w-44">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filtrar por campo</label>
              <select value={fieldDraft} onChange={(e) => { setFieldDraft(e.target.value); setValueDraft(''); }} className={hbtInputCls}>
                <option value="">—</option>
                {filterable.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {fieldDraft && (
              <div className="w-44">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Igual a</label>
                {(() => {
                  const d = defs.find((x) => x.name === fieldDraft);
                  if (d && d.validValues.length > 0)
                    return (
                      <select value={valueDraft} onChange={(e) => setValueDraft(e.target.value)} className={hbtInputCls}>
                        <option value="">—</option>
                        {d.validValues.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.value === v.label ? v.value : `${v.value} · ${v.label}`}
                          </option>
                        ))}
                      </select>
                    );
                  return <input value={valueDraft} onChange={(e) => setValueDraft(e.target.value)} className={hbtInputCls} />;
                })()}
              </div>
            )}
          </>
        )}
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
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          {canCreate && (
            <button type="button" onClick={() => setCreating(true)} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {newLabel}
            </button>
          )}
        </div>
      </form>

      <ErrorBox message={error} />
      {schema?.warnings && schema.warnings.length > 0 && <ErrorBox message={schema.warnings.join(' · ')} />}

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-bold px-3 py-2 whitespace-nowrap">
                <button onClick={() => { setOrder((o) => (o === 'asc' ? 'desc' : 'asc')); setPage(1); }} className="font-bold hover:text-indigo-700">
                  Código {order === 'asc' ? '▲' : '▼'}
                </button>
              </th>
              <th className="text-left font-bold px-3 py-2">Nombre</th>
              {shown.map((d) => (
                <th key={d.name} className="text-left font-bold px-3 py-2 whitespace-nowrap">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listQ.isLoading && (
              <tr>
                <td colSpan={2 + shown.length} className="px-3 py-6 text-center text-slate-500">
                  Consultando SAP…
                </td>
              </tr>
            )}
            {!listQ.isLoading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={2 + shown.length} className="px-3 py-6 text-center text-slate-500">
                  Sin registros
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.code} onClick={() => setSelected(r.code)} className="hover:bg-indigo-50/50 cursor-pointer">
                <td className="px-3 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">{r.code}</td>
                <td className="px-3 py-2 text-slate-700">{r.name}</td>
                {shown.map((d) => (
                  <td key={d.name} className="px-3 py-2 text-slate-700 max-w-[260px] truncate" title={displayValue(d, r.fields[d.name])}>
                    {displayValue(d, r.fields[d.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasMore={Boolean(listQ.json?.hasMore)} total={total} count={rows.length} limit={limit} onPage={setPage} />
      {defs.length > COLS && <p className="text-[11px] text-slate-500">La tabla muestra {COLS} de {defs.length} campos; abra un registro para ver todos.</p>}

      {selected && detailQ.data && info && (
        <HbtEditModal
          key={selected}
          title={`${info.description} · ${selected}`}
          subtitle={`@${info.name} · ${MODE_BADGE[mode].label}`}
          variant="table"
          defs={defs.filter((d) => !d.secret)}
          initial={detailQ.data.fields}
          code={detailQ.data.code}
          name={detailQ.data.name}
          readOnly={mode === 'readonly'}
          readOnlyNote={
            info.name === 'HBT_FE_PARAMETRO'
              ? 'Parámetros con credenciales y endpoints del proveedor de facturación electrónica: solo lectura. Las credenciales no se muestran.'
              : 'Registros transaccionales, bitácoras o tablas de trabajo que escribe el propio complemento HBT: solo lectura.'
          }
          warning={mode === 'config' ? 'Esta tabla parametriza el comportamiento del complemento HBT. Un cambio puede afectar procesos de facturación, retenciones o medios magnéticos.' : undefined}
          writeUrl={`/api/sap/hbt/tables/${encodeURIComponent(table)}/${encodeURIComponent(selected)}`}
          deleteUrl={mode === 'crud' || mode === 'config' ? `/api/sap/hbt/tables/${encodeURIComponent(table)}/${encodeURIComponent(selected)}` : undefined}
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
      {creating && info && (
        <HbtEditModal
          title={`Nuevo registro · ${info.description}`}
          subtitle={`@${info.name}`}
          variant="table"
          isCreate
          defs={defs.filter((d) => !d.secret)}
          initial={{}}
          code={newCodeHint ?? fixedPrefix}
          warning={mode === 'config' ? 'Esta tabla parametriza el comportamiento del complemento HBT.' : undefined}
          writeUrl={`/api/sap/hbt/tables/${encodeURIComponent(table)}`}
          onClose={() => setCreating(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
};
