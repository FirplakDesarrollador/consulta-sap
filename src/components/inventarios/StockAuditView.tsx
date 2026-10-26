'use client';

import React, { useState } from 'react';
import { Boxes, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { StockRow } from '@/types/inventory';
import { money, qty } from '@/lib/comprasApi';
import { SapLookupInput } from '../common/SapLookupInput';
import { InventoryDocumentsView } from './InventoryDocumentsView';
import { InventoryNumbersPanel } from './InventoryNumbersPanel';

type Tab = 'stock' | 'countings' | 'postings' | 'serials' | 'batches';

const TABS: { id: Tab; label: string }[] = [
  { id: 'stock', label: 'Existencias por almacén (OITW)' },
  { id: 'countings', label: 'Recuentos (OINC)' },
  { id: 'postings', label: 'Contabilización de stock (OIQR)' },
  { id: 'serials', label: 'Números de serie (OSRN)' },
  { id: 'batches', label: 'Lotes (OBTN)' }
];

/** Auditoría de stocks: existencias, recuentos, contabilizaciones, series y lotes */
export const StockAuditView: React.FC<{ globalFilter?: string; refreshKey?: number }> = ({ globalFilter = '', refreshKey = 0 }) => {
  const [tab, setTab] = useState<Tab>('stock');

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Boxes className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Inventario: Auditoría de Stocks (SAP Service Layer)</h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">SAP Real Server-Side</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl border transition ${tab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'stock' && <StockPanel globalFilter={globalFilter} refreshKey={refreshKey} />}
      {tab === 'countings' && <InventoryDocumentsView kinds={['countings']} globalFilter={globalFilter} refreshKey={refreshKey} embedded />}
      {tab === 'postings' && <InventoryDocumentsView kinds={['postings']} globalFilter={globalFilter} refreshKey={refreshKey} embedded />}
      {tab === 'serials' && <InventoryNumbersPanel type="serials" refreshKey={refreshKey} />}
      {tab === 'batches' && <InventoryNumbersPanel type="batches" refreshKey={refreshKey} />}
    </div>
  );
};

const StockPanel: React.FC<{ globalFilter: string; refreshKey: number }> = ({ globalFilter, refreshKey }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(globalFilter);
  const [temp, setTemp] = useState(globalFilter);
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const [warehouse, setWarehouse] = useState('');
  const [tempWhs, setTempWhs] = useState('');
  const [withStock, setWithStock] = useState(true);
  const [includeZero, setIncludeZero] = useState(false);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setSearch(globalFilter);
    setTemp(globalFilter);
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (search) params.set('search', search);
  if (warehouse) params.set('warehouse', warehouse);
  if (withStock) params.set('withStock', '1');
  if (includeZero) params.set('includeZero', '1');
  const q = useSapQuery<StockRow[]>(`/api/sap/inventory/stock?${params.toString()}`, [refreshKey]);
  const rows = Array.isArray(q.data) ? q.data : [];

  const exportCSV = () => {
    const header = 'ItemCode,ItemName,Almacen,EnStock,Comprometido,Pedido,Disponible,Minimo,Maximo,CostoPromedio\n';
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = rows
      .map((r) => [r.itemCode, r.itemName, r.warehouseCode, r.inStock, r.committed, r.ordered, r.available, r.minStock, r.maxStock, r.avgPrice].map(esc).join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Existencias_Pagina_${page}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(temp.trim());
          setWarehouse(tempWhs.trim());
          setPage(1);
        }}
        className="bg-white border border-slate-200/90 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Artículo (código o nombre)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="Ej: CMPD06, TABLERO" className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Almacén</label>
          <SapLookupInput type="warehouses" value={tempWhs} onChange={(c) => setTempWhs(c)} placeholder="Todos" />
        </div>
        <label className="md:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={withStock} onChange={(e) => { setWithStock(e.target.checked); setPage(1); }} /> Solo con existencia
        </label>
        <label className="md:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={includeZero} onChange={(e) => { setIncludeZero(e.target.checked); setPage(1); }} /> Incluir almacenes en 0
        </label>
        <div className="md:col-span-2 flex gap-1.5">
          <button type="submit" className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
            Buscar
          </button>
          {(temp || tempWhs) && (
            <button
              type="button"
              onClick={() => {
                setTemp('');
                setTempWhs('');
                setSearch('');
                setWarehouse('');
                setPage(1);
              }}
              className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {q.error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {q.error}
        </div>
      )}

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 text-xs text-slate-600">
          <span>
            Página <strong className="font-mono text-slate-900">{page}</strong> • {rows.length} filas artículo/almacén (25 artículos por página)
          </span>
          <div className="flex items-center gap-2">
            {q.isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
            {rows.length > 0 && (
              <button onClick={exportCSV} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4 text-left">Artículo</th>
                <th className="py-3 px-4 text-left">Descripción</th>
                <th className="py-3 px-4 text-left">Almacén</th>
                <th className="py-3 px-4 text-right">En stock</th>
                <th className="py-3 px-4 text-right">Comprometido</th>
                <th className="py-3 px-4 text-right">Pedido</th>
                <th className="py-3 px-4 text-right">Disponible</th>
                <th className="py-3 px-4 text-right">Mín / Máx</th>
                <th className="py-3 px-4 text-right">Costo prom.</th>
                <th className="py-3 px-4 text-left">UM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                  </td>
                </tr>
              )}
              {!q.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    Sin existencias para los criterios seleccionados en esta página.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const low = r.minStock > 0 && r.inStock < r.minStock;
                return (
                  <tr key={`${r.itemCode}-${r.warehouseCode}`} className={`hover:bg-emerald-50/40 ${r.locked ? 'opacity-60' : ''}`}>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{r.itemCode}</td>
                    <td className="py-2.5 px-4 max-w-[280px] truncate" title={r.itemName}>
                      {r.itemName}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {r.warehouseCode}
                      {r.locked && <span className="ml-1 text-[10px] text-rose-600 font-bold">BLOQ.</span>}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${low ? 'text-rose-600' : r.inStock < 0 ? 'text-rose-700' : ''}`}>{qty(r.inStock)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{qty(r.committed)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{qty(r.ordered)}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${r.available < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{qty(r.available)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {qty(r.minStock)} / {qty(r.maxStock)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{money(r.avgPrice)}</td>
                    <td className="py-2.5 px-4">{r.uom}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button onClick={() => setPage(page - 1)} disabled={page === 1 || q.isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span className="px-3 py-1 bg-slate-200/80 rounded-lg font-mono font-bold">Pág. {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={!q.json?.hasMore || q.isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold text-emerald-700">
            Siguiente <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
