'use client';

import React, { useState } from 'react';
import { useSapQuery } from '@/lib/useSapQuery';
import {
  ShoppingCart,
  Truck,
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
import { DocumentRow, PurchaseDocKind, PurchaseDocSource } from '@/types/sapBusiness';
import { PurchaseDocumentDetailModal } from '../modals/PurchaseDocumentDetailModal';
import { PurchaseDocumentFormModal } from '../modals/PurchaseDocumentFormModal';

interface ComprasDocumentsViewProps {
  kind: PurchaseDocKind;
  globalFilter?: string;
  refreshKey?: number;
}

const META: Record<PurchaseDocKind, { title: string; label: string; table: string; icon: typeof ShoppingCart }> = {
  'purchase-orders': { title: 'Compras: Órdenes de Compra (OPOR - SAP Service Layer)', label: 'Orden de Compra', table: 'OPOR', icon: ShoppingCart },
  'goods-receipts': { title: 'Compras: Entrada de Mercancías (OPDN - SAP Service Layer)', label: 'Entrada de Mercancía', table: 'OPDN', icon: Truck }
};

const statusBadgeClass = (status: string) => {
  if (status === 'Cerrado') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'Cancelado') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
};

/**
 * Órdenes de Compra (OPOR) / Entradas de Mercancía (OPDN) con sus borradores (ODRF).
 * Listado paginado del lado del servidor, detalle, creación, edición y acciones del Service Layer.
 */
export const ComprasDocumentsView: React.FC<ComprasDocumentsViewProps> = ({ kind, globalFilter = '', refreshKey = 0 }) => {
  const meta = META[kind];
  const Icon = meta.icon;

  const [source, setSource] = useState<PurchaseDocSource>('documents');
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
  const [prevKind, setPrevKind] = useState(kind);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Sincronizar con la búsqueda global del Header
  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setSearch(globalFilter);
    setTempSearch(globalFilter);
    setPage(1);
  }
  // Reiniciar al cambiar entre Órdenes y Entradas
  if (kind !== prevKind) {
    setPrevKind(kind);
    setSource('documents');
    setPage(1);
    setSelectedId(null);
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit), source });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (search) params.set('search', search);
  if (status !== 'ALL') params.set('status', status);
  const listUrl = `/api/sap/purchasing/${kind}?${params.toString()}`;
  const query = useSapQuery<DocumentRow[]>(listUrl, [refreshKey, reloadTick]);
  const rows = Array.isArray(query.data) ? query.data : [];
  const isLoading = query.isLoading;
  const error = query.error;
  const hasMore = Boolean(query.json?.hasMore);
  const writesEnabled = query.json ? Boolean(query.json.writesEnabled) : null;

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setSearch(tempSearch);
    setPage(1);
  };

  const clearFilters = () => {
    setTempStart('');
    setTempEnd('');
    setTempSearch('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setStatus('ALL');
    setPage(1);
  };

  const exportCSV = () => {
    const esc = (v: string | undefined) => `"${(v || '').replace(/"/g, '""')}"`;
    const header = 'DocNum,CardCode,CardName,NumAtCard,DocDate,DocDueDate,DocTotal,Currency,Status,Comments\n';
    const lines = rows.map(
      (d) =>
        `${esc(d.docNum)},${esc(d.cardCode)},${esc(d.cardName)},${esc(d.numAtCard)},${esc(d.docDate)},${esc(d.docDueDate)},${d.docTotal},${esc(d.currency)},${esc(d.status)},${esc(d.comments)}`
    );
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.table}_${source}_Pagina_${page}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reload = () => setReloadTick((t) => t + 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{meta.title}</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              SAP Real Server-Side
            </span>
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
            Crear, consultar, editar, cerrar y cancelar según lo que permite el SAP Service Layer
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">
              <Download className="h-4 w-4" />
              Exportar ({rows.length})
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            Nueva {meta.label}
          </button>
        </div>
      </div>

      {/* Documentos / Borradores */}
      <div className="flex gap-2 text-xs font-bold">
        {(['documents', 'drafts'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSource(s);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl border transition ${
              source === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {s === 'documents' ? `Documentos (${meta.table})` : 'Borradores (ODRF)'}
          </button>
        ))}
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

      {/* Filtros */}
      <form onSubmit={applyFilters} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="h-4 w-4 text-emerald-600" />
          <span>Filtros y búsqueda en SAP</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar (N° documento, proveedor, código, ref.)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={tempSearch}
                placeholder="Ej: 2032028, MADERAS, PN900..."
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
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
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-1.5">
            <button type="submit" className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
              Buscar
            </button>
            {(tempStart || tempEnd || tempSearch || status !== 'ALL') && (
              <button type="button" onClick={clearFilters} title="Limpiar filtros" className="p-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Barra superior */}
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
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
          <span>
            Página <strong className="text-slate-900 font-mono">{page}</strong> • Mostrando <strong className="text-slate-900">{rows.length}</strong>{' '}
            {source === 'drafts' ? 'borradores' : 'documentos'}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">N° SAP</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Ref. proveedor</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">{kind === 'purchase-orders' ? 'Entrega' : 'Vencimiento'}</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4">Comentarios</th>
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
                    No se encontraron {source === 'drafts' ? 'borradores' : 'documentos'} con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                rows.map((d, idx) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={`hover:bg-emerald-50/50 cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 group-hover:underline">{d.docNum}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{d.cardName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{d.cardCode}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.numAtCard || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{d.docDate}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{d.docDueDate || '—'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                      {d.currency} {d.docTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${statusBadgeClass(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-sm truncate" title={d.comments}>
                      {d.comments || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(d.id);
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

      {selectedId && (
        <PurchaseDocumentDetailModal
          key={selectedId}
          kind={kind}
          label={meta.label}
          docId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
      {showCreate && (
        <PurchaseDocumentFormModal kind={kind} label={meta.label} onClose={() => setShowCreate(false)} onCreated={reload} />
      )}
    </div>
  );
};
