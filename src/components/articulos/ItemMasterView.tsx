'use client';

import React, { useState } from 'react';
import {
  Package,
  Filter,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Eye,
  X,
  Plus,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { money, qty } from '@/lib/comprasApi';
import { ItemCatalogs, ItemRow } from '@/types/items';
import { ItemDetailModal } from './ItemDetailModal';
import { ItemFormModal } from './ItemFormModal';
import { itemInputCls } from './ItemFieldInput';

interface Props {
  globalFilter?: string;
  refreshKey?: number;
}

interface Filters {
  search: string;
  group: string;
  inventory: string;
  sales: string;
  purchase: string;
  status: string;
  withStock: boolean;
  warehouse: string;
}
const EMPTY: Filters = { search: '', group: '', inventory: '', sales: '', purchase: '', status: '', withStock: false, warehouse: '' };

const YesNoSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={itemInputCls}>
      <option value="">Todos</option>
      <option value="yes">Sí</option>
      <option value="no">No</option>
    </select>
  </div>
);

/**
 * Maestro del Artículo (OITM): listado paginado en el servidor con búsqueda y filtros,
 * detalle por pestañas, creación, edición, inactivación y eliminación vía SAP Service Layer.
 */
export const ItemMasterView: React.FC<Props> = ({ globalFilter = '', refreshKey = 0 }) => {
  const [applied, setApplied] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [draft, setDraft] = useState<Filters>({ ...EMPTY, search: globalFilter });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setApplied((f) => ({ ...f, search: globalFilter }));
    setDraft((f) => ({ ...f, search: globalFilter }));
    setPage(1);
  }

  const cat = useSapQuery<ItemCatalogs>('/api/sap/item-catalogs');
  const groups = cat.data?.itemGroups ?? [];
  const groupName = (c: number | null) => (c === null ? '' : (groups.find((g) => g.code === c)?.name ?? String(c)));

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (applied.search) params.set('search', applied.search);
  if (applied.group) params.set('group', applied.group);
  if (applied.inventory) params.set('inventory', applied.inventory);
  if (applied.sales) params.set('sales', applied.sales);
  if (applied.purchase) params.set('purchase', applied.purchase);
  if (applied.status) params.set('status', applied.status);
  if (applied.withStock) params.set('withStock', '1');
  const query = useSapQuery<ItemRow[]>(`/api/sap/items?${params.toString()}`, [refreshKey, reloadTick]);
  const allRows = Array.isArray(query.data) ? query.data : [];
  // El Service Layer no filtra por la colección de almacenes: se aplica sobre la página cargada
  const rows = applied.warehouse ? allRows.filter((r) => r.defaultWarehouse.toLowerCase() === applied.warehouse.trim().toLowerCase()) : allRows;
  const { isLoading, error } = query;
  const hasMore = Boolean(query.json?.hasMore);
  const total = typeof query.json?.total === 'number' ? (query.json.total as number) : null;
  const writesEnabled = query.json ? Boolean(query.json.writesEnabled) : null;
  const reload = () => setReloadTick((t) => t + 1);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const apply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setApplied({ ...draft, search: draft.search.trim() });
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY);

  const exportCSV = () => {
    const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'ItemCode,Descripcion,Grupo,CodigoBarras,Inventario,Venta,Compra,Estado,UdM,AlmacenDefecto,EnStock,Comprometido,Solicitado,Disponible,CostoPromedio\n';
    const yn = (b: boolean) => (b ? 'Si' : 'No');
    const lines = rows.map((r) =>
      [r.itemCode, r.itemName, groupName(r.groupCode), r.barCode, yn(r.inventoryItem), yn(r.salesItem), yn(r.purchaseItem), r.status, r.uom, r.defaultWarehouse, r.inStock, r.committed, r.ordered, r.available, r.avgPrice]
        .map(esc)
        .join(',')
    );
    const blob = new Blob(['\ufeff' + header + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OITM_Pagina_${page}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Package className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Maestro del Artículo (OITM)</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">SAP Real Server-Side</span>
            {writesEnabled !== null && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  writesEnabled ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={writesEnabled ? 'Las escrituras se envían a SAP' : 'SAP_ALLOW_WRITES no está activo: solo simulación'}
              >
                {writesEnabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {writesEnabled ? 'Escritura habilitada' : 'Escritura deshabilitada (solo simulación)'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Consulta, creación, edición, inactivación y eliminación de artículos. Existencias y precios se muestran en solo lectura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">
              <Download className="h-4 w-4" /> Exportar ({rows.length})
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo artículo
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold">Error de conexión con SAP Service Layer:</div>
              <div className="break-all">{error}</div>
            </div>
          </div>
          <button onClick={reload} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      <form onSubmit={apply} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="h-4 w-4 text-emerald-600" />
          <span>Filtros y búsqueda en SAP</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar (código, descripción o código de barras)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={draft.search}
                placeholder="Ej: CMPD06-0012, tablero, 7707324384092"
                onChange={(e) => set('search', e.target.value)}
                className={`${itemInputCls} pl-9`}
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Grupo de artículos</label>
            <select value={draft.group} onChange={(e) => set('group', e.target.value)} className={itemInputCls}>
              <option value="">Todos</option>
              {groups.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code} · {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado</label>
            <select value={draft.status} onChange={(e) => set('status', e.target.value)} className={itemInputCls}>
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1.5">
              <input type="checkbox" checked={draft.withStock} onChange={(e) => set('withStock', e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Con existencias
            </label>
          </div>
          <div className="md:col-span-2">
            <YesNoSelect label="Inventario" value={draft.inventory} onChange={(v) => set('inventory', v)} />
          </div>
          <div className="md:col-span-2">
            <YesNoSelect label="Venta" value={draft.sales} onChange={(v) => set('sales', v)} />
          </div>
          <div className="md:col-span-2">
            <YesNoSelect label="Compra" value={draft.purchase} onChange={(v) => set('purchase', v)} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1" title="Se aplica sobre la página cargada">
              Almacén por defecto (página actual)
            </label>
            <select value={draft.warehouse} onChange={(e) => set('warehouse', e.target.value)} className={itemInputCls}>
              <option value="">Todos</option>
              {(cat.data?.warehouses ?? []).map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-end gap-1.5">
            <button type="submit" className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
              Buscar
            </button>
            {dirty && (
              <button type="button" onClick={clear} title="Limpiar filtros" className="p-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/90 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-slate-700">Por página:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
          <span>
            Página <strong className="text-slate-900 font-mono">{page}</strong> • Mostrando <strong className="text-slate-900">{rows.length}</strong>
            {total !== null && (
              <>
                {' '}
                de <strong className="text-slate-900">{total.toLocaleString('es-ES')}</strong>
              </>
            )}{' '}
            artículos
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Grupo</th>
                <th className="py-3.5 px-4 text-center">I / V / C</th>
                <th className="py-3.5 px-4">UdM</th>
                <th className="py-3.5 px-4 text-right">En stock</th>
                <th className="py-3.5 px-4 text-right">Disponible</th>
                <th className="py-3.5 px-4 text-right">Costo prom.</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                    <div className="font-semibold text-xs text-slate-700 mt-2">Consultando SAP Service Layer...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No se encontraron artículos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.itemCode} onClick={() => setSelected(r.itemCode)} className={`hover:bg-emerald-50/50 cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 group-hover:underline whitespace-nowrap">{r.itemCode}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={r.itemName}>{r.itemName}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={groupName(r.groupCode)}>{groupName(r.groupCode) || '—'}</td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                      {r.inventoryItem ? 'I' : '·'} {r.salesItem ? 'V' : '·'} {r.purchaseItem ? 'C' : '·'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.uom || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{qty(r.inStock)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{qty(r.available)}</td>
                    <td className="py-3 px-4 text-right font-mono">{money(r.avgPrice)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${r.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{r.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r.itemCode);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                        title="Ver detalle"
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
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Página <strong className="text-slate-900">{page}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1 || isLoading} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold">
              <ChevronsLeft className="h-3.5 w-3.5" /> Inicio
            </button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1 || isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold">
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="px-3 py-1 bg-slate-200/80 rounded-lg font-mono font-bold">Pág. {page}</span>
            <button onClick={() => setPage(page + 1)} disabled={!hasMore || isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold text-emerald-700">
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selected && <ItemDetailModal key={selected} code={selected} onClose={() => setSelected(null)} onChanged={reload} />}
      {showCreate && <ItemFormModal onClose={() => setShowCreate(false)} onSaved={reload} />}
    </div>
  );
};
