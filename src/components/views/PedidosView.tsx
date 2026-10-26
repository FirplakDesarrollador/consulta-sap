'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
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
  Lock
} from 'lucide-react';
import { DocumentRow } from '@/types/sapBusiness';
import { OrderDetailModal } from '../modals/OrderDetailModal';

interface PedidosViewProps {
  pedidos: DocumentRow[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  serverPage?: number;
  serverLimit?: number;
  serverHasMore?: boolean;
  onServerPageChange?: (page: number) => void;
  onServerLimitChange?: (limit: number) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
  serverSearchQuery?: string;
  onServerSearchSubmit?: (query: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

const statusBadgeClass = (status: string) => {
  if (status === 'Cerrado') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'Cancelado') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
};

/**
 * Pedidos de Clientes (ORDR) — vista de solo lectura sobre SAP Service Layer.
 */
export const PedidosView: React.FC<PedidosViewProps> = ({
  pedidos,
  isLoading = false,
  errorMessage = null,
  onRetry,
  serverPage = 1,
  serverLimit = 50,
  serverHasMore = false,
  onServerPageChange,
  onServerLimitChange,
  startDate = '',
  endDate = '',
  onDateRangeChange,
  serverSearchQuery = '',
  onServerSearchSubmit,
  statusFilter = 'ALL',
  onStatusFilterChange
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempSearch, setTempSearch] = useState(serverSearchQuery);
  const [prevServerSearchQuery, setPrevServerSearchQuery] = useState(serverSearchQuery);

  // Mantener el campo de búsqueda sincronizado con la búsqueda global del Header
  if (serverSearchQuery !== prevServerSearchQuery) {
    setPrevServerSearchQuery(serverSearchQuery);
    setTempSearch(serverSearchQuery);
  }

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onDateRangeChange) onDateRangeChange(tempStartDate, tempEndDate);
    if (onServerSearchSubmit) onServerSearchSubmit(tempSearch);
  };

  const handleClearFilters = () => {
    setTempStartDate('');
    setTempEndDate('');
    setTempSearch('');
    if (onDateRangeChange) onDateRangeChange('', '');
    if (onServerSearchSubmit) onServerSearchSubmit('');
    if (onStatusFilterChange) onStatusFilterChange('ALL');
  };

  const handleExportCSV = () => {
    const esc = (v: string | undefined) => `"${(v || '').replace(/"/g, '""')}"`;
    const headers = 'DocNum,CardCode,CardName,NumAtCard,DocDate,DocDueDate,DocTotal,Currency,Status,Comments\n';
    const rows = pedidos.map(
      (d) =>
        `${esc(d.docNum)},${esc(d.cardCode)},${esc(d.cardName)},${esc(d.numAtCard)},${esc(d.docDate)},${esc(d.docDueDate)},${d.docTotal},${esc(d.currency)},${esc(d.status)},${esc(d.comments)}`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pedidos_SAP_Firplak_Pagina_${serverPage}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Ventas: Pedidos de Clientes (ORDR - SAP Service Layer)
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              SAP Real Server-Side
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="h-3 w-3" />
              Solo consulta
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Haga clic en cualquier pedido para consultar su detalle con las líneas, cantidades pendientes y fechas de entrega
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pedidos.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Excel ({pedidos.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message with Reintentar */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold">Error de conexión con SAP Service Layer:</div>
              <div className="break-all">{errorMessage}</div>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reintentar Conexión</span>
            </button>
          )}
        </div>
      )}

      {/* Server Filters Bar */}
      <form onSubmit={handleApplyFilters} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Filtros y Búsqueda en el Total de Pedidos de SAP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Buscar en SAP (N° Pedido, Cliente, Código, Ref. Cliente)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: 164932, SODIMAC, CN900315752..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Desde Fecha</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasta Fecha</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado SAP</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                if (onStatusFilterChange) onStatusFilterChange(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Abierto">Abiertos (Open)</option>
              <option value="Cerrado">Cerrados (Closed)</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-1.5">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Buscar
            </button>
            {(tempStartDate || tempEndDate || tempSearch || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleClearFilters}
                title="Limpiar filtros"
                className="p-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-700">Pedidos por página:</span>
            <select
              value={serverLimit}
              onChange={(e) => {
                if (onServerLimitChange) onServerLimitChange(Number(e.target.value));
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={25}>25 pedidos</option>
              <option value={50}>50 pedidos</option>
              <option value={100}>100 pedidos</option>
              <option value={200}>200 pedidos</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />}
            <span>
              Página <strong className="text-slate-900 font-mono text-sm">{serverPage}</strong> • Mostrando{' '}
              <strong className="text-slate-900 font-bold">{pedidos.length}</strong> pedidos de SAP
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 whitespace-nowrap">Pedido SAP</th>
                  <th className="py-3.5 px-4">Cliente (CardName)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Código (CardCode)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Ref. Cliente</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fecha Pedido</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fecha Entrega</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Total</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado</th>
                  <th className="py-3.5 px-4">Comentarios</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="font-semibold text-xs text-slate-700">
                          Consultando pedidos en SAP Service Layer...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                      No se encontraron pedidos en SAP con los criterios de búsqueda y fechas seleccionadas.
                    </td>
                  </tr>
                ) : (
                  pedidos.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedOrderId(doc.id)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap group-hover:underline">
                        {doc.docNum}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{doc.cardName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{doc.cardCode}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">{doc.numAtCard || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{doc.docDate}</td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{doc.docDueDate || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap bg-slate-100/40">
                        {doc.currency} {doc.docTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${statusBadgeClass(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-sm truncate" title={doc.comments}>
                        {doc.comments || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(doc.id);
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-2xs"
                          title="Ver detalle completo del pedido"
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

          {/* Server Pagination */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página <strong className="text-slate-900">{serverPage}</strong> de resultados del servidor SAP
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onServerPageChange && onServerPageChange(1)}
                disabled={serverPage === 1 || isLoading}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
                title="Primera página"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
                <span>Inicio</span>
              </button>

              <button
                onClick={() => onServerPageChange && onServerPageChange(serverPage - 1)}
                disabled={serverPage === 1 || isLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
                title="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1 bg-slate-200/80 rounded-lg font-mono font-bold text-slate-800">
                Pág. {serverPage}
              </span>

              <button
                onClick={() => onServerPageChange && onServerPageChange(serverPage + 1)}
                disabled={!serverHasMore || isLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800"
                title="Página siguiente"
              >
                <span>Siguiente ({serverLimit} más)</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};
