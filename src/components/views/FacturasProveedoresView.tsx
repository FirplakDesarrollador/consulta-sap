'use client';

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Filter,
  Search,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Eye,
  X,
  DollarSign,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { DocumentRow } from '@/types/sapBusiness';
import { PurchaseInvoiceDetailModal } from '../modals/PurchaseInvoiceDetailModal';

interface FacturasProveedoresViewProps {
  facturas: DocumentRow[];
  globalFilter: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  // Server-side props
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
  onRefresh?: () => void;
}

export const FacturasProveedoresView: React.FC<FacturasProveedoresViewProps> = ({
  facturas,
  globalFilter,
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
  onStatusFilterChange,
  onRefresh
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Sync temp input state when props change
  const [prevProps, setPrevProps] = useState({ startDate, endDate, serverSearchQuery });
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempSearch, setTempSearch] = useState(serverSearchQuery);

  if (
    prevProps.startDate !== startDate ||
    prevProps.endDate !== endDate ||
    prevProps.serverSearchQuery !== serverSearchQuery
  ) {
    setPrevProps({ startDate, endDate, serverSearchQuery });
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempSearch(serverSearchQuery);
  }

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onDateRangeChange) {
      onDateRangeChange(tempStartDate, tempEndDate);
    }
    if (onServerSearchSubmit) {
      onServerSearchSubmit(tempSearch);
    }
  };

  const handleClearFilters = () => {
    setTempStartDate('');
    setTempEndDate('');
    setTempSearch('');
    if (onDateRangeChange) {
      onDateRangeChange('', '');
    }
    if (onServerSearchSubmit) {
      onServerSearchSubmit('');
    }
    if (onStatusFilterChange) {
      onStatusFilterChange('ALL');
    }
  };

  // Client-side quick filter on top of currently loaded dataset (by global search or cardCode/name/numAtCard)
  const displayFacturas = useMemo(() => {
    if (!globalFilter) return facturas;
    const term = globalFilter.toLowerCase();
    return facturas.filter(
      (f) =>
        f.docNum.toLowerCase().includes(term) ||
        f.cardName.toLowerCase().includes(term) ||
        f.cardCode.toLowerCase().includes(term) ||
        (f.numAtCard && f.numAtCard.toLowerCase().includes(term)) ||
        (f.comments && f.comments.toLowerCase().includes(term))
    );
  }, [facturas, globalFilter]);

  // Aggregate stats from visible data
  const stats = useMemo(() => {
    let totalMonto = 0;
    let abiertosCount = 0;
    let abiertosMonto = 0;
    let cerradosCount = 0;
    let cerradosMonto = 0;

    for (const f of displayFacturas) {
      totalMonto += f.docTotal;
      if (f.status === 'Abierto') {
        abiertosCount++;
        abiertosMonto += f.docTotal;
      } else {
        cerradosCount++;
        cerradosMonto += f.docTotal;
      }
    }

    return {
      totalCount: displayFacturas.length,
      totalMonto,
      abiertosCount,
      abiertosMonto,
      cerradosCount,
      cerradosMonto
    };
  }, [displayFacturas]);

  const handleExportCSV = () => {
    const headers = 'DocNum,NumAtCard,CardCode,CardName,DocDate,DocDueDate,DocTotal,Currency,Status,Comments\n';
    const rows = displayFacturas.map(
      (f) =>
        `"${f.docNum}","${f.numAtCard || ''}","${f.cardCode}","${f.cardName.replace(/"/g, '""')}","${f.docDate}","${f.docDueDate || ''}",${f.docTotal},"${f.currency}","${f.status}","${(f.comments || '').replace(/"/g, '""')}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Facturas_Proveedores_SAP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200/60">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Facturas de Proveedores (OPCH)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Compras • SAP B1
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Service Layer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta en tiempo real de facturas de compras, causaciones y saldos de proveedores
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={displayFacturas.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition disabled:opacity-50"
            title="Exportar listado visible a CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition disabled:opacity-50"
              title="Refrescar datos de SAP"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Facturas Consultadas</span>
            <Receipt className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {stats.totalCount}
          </div>
          <span className="text-[11px] text-slate-400">En la página actual</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Causado (COP)</span>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono truncate" title={`$ ${stats.totalMonto.toLocaleString('es-CO')}`}>
            ${stats.totalMonto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-400">Suma acumulada visible</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-medium text-slate-600">Facturas Abiertas</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {stats.abiertosCount}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold font-mono truncate block" title={`$ ${stats.abiertosMonto.toLocaleString('es-CO')}`}>
            ${stats.abiertosMonto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium text-slate-600">Facturas Cerradas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {stats.cerradosCount}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold font-mono truncate block" title={`$ ${stats.cerradosMonto.toLocaleString('es-CO')}`}>
            ${stats.cerradosMonto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* 3. Server-side Query Filters Bar */}
      <form
        onSubmit={handleApplyFilters}
        className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DocNum, Factura Proveedor (NumAtCard), NIT o Proveedor..."
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              title="Fecha Contabilización Desde"
            />
            <span className="text-slate-400 text-xs">a</span>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              title="Fecha Contabilización Hasta"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Abierto">Abiertos (Pendientes)</option>
              <option value="Cerrado">Cerrados (Pagados/Conciliados)</option>
            </select>
          </div>

          {/* Records limit */}
          {onServerLimitChange && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Ver:</span>
              <select
                value={serverLimit}
                onChange={(e) => onServerLimitChange(Number(e.target.value))}
                className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-600"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          )}

          {/* Apply and Clear buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            >
              Consultar SAP
            </button>
            {(tempSearch || tempStartDate || tempEndDate || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="Limpiar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* 4. Error Message Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Error al conectar con SAP Business One:</span> {errorMessage}
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* 5. Main Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Doc. SAP</th>
                <th className="py-3 px-3.5">No. Fact. Prov.</th>
                <th className="py-3 px-3.5">Proveedor (Razón Social)</th>
                <th className="py-3 px-3.5">Código (CardCode)</th>
                <th className="py-3 px-3.5">Fecha Contab.</th>
                <th className="py-3 px-3.5">Vencimiento</th>
                <th className="py-3 px-3.5 text-right">Importe Total</th>
                <th className="py-3 px-3.5 text-center">Estado</th>
                <th className="py-3 px-3.5">Observaciones</th>
                <th className="py-3 px-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="font-semibold text-xs">Consultando facturas de proveedores en SAP Service Layer...</span>
                    </div>
                  </td>
                </tr>
              ) : displayFacturas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No se encontraron facturas de proveedores</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajusta los filtros de fecha, estado o búsqueda para ampliar el rango de consulta.
                    </p>
                  </td>
                </tr>
              ) : (
                displayFacturas.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3.5 font-mono font-bold text-emerald-700">
                      {doc.docNum}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                      {doc.numAtCard && doc.numAtCard.trim() !== '' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-mono text-[11px]">
                          {doc.numAtCard}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[240px] truncate" title={doc.cardName}>
                      {doc.cardName}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-500">
                      {doc.cardCode}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-mono">
                      {doc.docDate}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-mono">
                      {doc.docDueDate || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900">
                      {doc.currency} {doc.docTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'Cerrado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'Abierto'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px] max-w-[180px] truncate" title={doc.comments}>
                      {doc.comments || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoiceId(doc.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                        title="Ver detalle completo de la factura"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 border-t border-slate-200 text-xs">
          <div className="text-slate-500 font-medium">
            Página <strong className="text-slate-800">{serverPage}</strong> • Mostrando{' '}
            <strong className="text-slate-800">{displayFacturas.length}</strong> facturas
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onServerPageChange?.(1)}
              disabled={serverPage <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-40 transition"
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onServerPageChange?.(serverPage - 1)}
              disabled={serverPage <= 1 || isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>
            <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
              {serverPage}
            </span>
            <button
              onClick={() => onServerPageChange?.(serverPage + 1)}
              disabled={!serverHasMore || isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 disabled:opacity-40 transition"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Modal for Invoice Detail */}
      <PurchaseInvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};

