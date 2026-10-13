'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Download,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  FileSpreadsheet,
  ArrowUpRight
} from 'lucide-react';
import { BusinessPartner } from '@/types/sapBusiness';
import { BusinessPartnerDetailModal } from '../modals/BusinessPartnerDetailModal';
import { AccountBalanceModal } from '../modals/AccountBalanceModal';

interface SociosViewProps {
  socios: BusinessPartner[];
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
  serverSearchQuery?: string;
  onServerSearchSubmit?: (query: string) => void;
  typeFilter?: string;
  onTypeFilterChange?: (type: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export const SociosView: React.FC<SociosViewProps> = ({
  socios,
  globalFilter,
  isLoading = false,
  errorMessage = null,
  onRetry,
  serverPage = 1,
  serverLimit = 50,
  serverHasMore = false,
  onServerPageChange,
  onServerLimitChange,
  serverSearchQuery = '',
  onServerSearchSubmit,
  typeFilter = 'ALL',
  onTypeFilterChange,
  statusFilter = 'ALL',
  onStatusFilterChange
}) => {
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string | null>(null);
  const [balancePartner, setBalancePartner] = useState<BusinessPartner | null>(null);

  // Local state for search input before submitting
  const [tempSearch, setTempSearch] = useState(serverSearchQuery);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onServerSearchSubmit) {
      onServerSearchSubmit(tempSearch);
    }
  };

  const handleClearFilters = () => {
    setTempSearch('');
    if (onServerSearchSubmit) onServerSearchSubmit('');
    if (onTypeFilterChange) onTypeFilterChange('ALL');
    if (onStatusFilterChange) onStatusFilterChange('ALL');
  };

  const handleExportCSV = () => {
    const headers = 'CardCode,CardName,CardType,TaxID,Phone,Email,City,Address,Balance,Currency,Status\n';
    const rows = socios.map(
      (s) =>
        `"${s.cardCode}","${(s.cardName || '').replace(/"/g, '""')}","${s.cardType}","${s.taxId}","${s.phone}","${s.email}","${(s.city || '').replace(/"/g, '""')}","${(s.address || '').replace(/"/g, '""')}",${s.balance},"${s.currency}","${s.status}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Socios_SAP_Firplak_Pagina_${serverPage}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <Users className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Socios de Negocios (OCRD - SAP Service Layer)
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              SAP Real Server-Side
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Directorio maestro de clientes y proveedores en tiempo real sincronizado con SAP Business One. Haga clic en cualquier socio para consultar su ficha completa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {socios.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Excel ({socios.length})</span>
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
              <div className="font-bold">Error al consultar socios de negocio en SAP Service Layer:</div>
              <div>{errorMessage}</div>
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

      {/* Server Filters Bar (Search across all SAP Business Partners) */}
      <form onSubmit={handleApplyFilters} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="h-4 w-4 text-amber-600" />
          <span>Filtros y Búsqueda en el Servidor SAP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Buscador General en SAP */}
          <div className="md:col-span-6 relative">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Buscar en SAP (Código CardCode, Razón Social, NIT o Alias)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: CN9003, DISTRIBUIDORA, 800123456..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Filtro Tipo de Socio */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Tipo de Socio
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                if (onTypeFilterChange) onTypeFilterChange(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="Cliente">Solo Clientes (cCustomer)</option>
              <option value="Proveedor">Solo Proveedores (cSupplier)</option>
              <option value="Lead">Leads (cLid)</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Estado SAP
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                if (onStatusFilterChange) onStatusFilterChange(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>
          </div>

          {/* Botones Aplicar y Limpiar */}
          <div className="md:col-span-2 flex items-end gap-1.5">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Buscar
            </button>
            {(tempSearch || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
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

      {/* Main Table Container */}
      <div className="space-y-3">
        {/* Top Bar with Server-side Pagination Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Socios por página:</span>
              <select
                value={serverLimit}
                onChange={(e) => {
                  if (onServerLimitChange) onServerLimitChange(Number(e.target.value));
                }}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value={25}>25 socios</option>
                <option value={50}>50 socios</option>
                <option value={100}>100 socios</option>
                <option value={200}>200 socios</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />}
            <span>
              Página <strong className="text-slate-900 font-mono text-sm">{serverPage}</strong> • Mostrando <strong className="text-slate-900 font-bold">{socios.length}</strong> socios de SAP
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 whitespace-nowrap">Código (CardCode)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Tipo</th>
                  <th className="py-3.5 px-4">Razón Social / Nombre</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">NIT / Identificación</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Contacto / Teléfono</th>
                  <th className="py-3.5 px-4">Ciudad / Dirección</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Saldo Cartera</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-amber-600" />
                        <span className="font-semibold text-xs text-slate-700">
                          Consultando socios de negocios en SAP Service Layer...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : socios.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                      No se encontraron socios de negocios en SAP con los criterios de búsqueda seleccionados.
                    </td>
                  </tr>
                ) : (
                  socios.map((s, idx) => (
                    <tr
                      key={s.cardCode}
                      onClick={() => setSelectedPartnerCode(s.cardCode)}
                      className={`hover:bg-amber-50/40 transition-colors cursor-pointer group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 whitespace-nowrap group-hover:underline">
                        {s.cardCode}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            s.cardType === 'Cliente'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : s.cardType === 'Proveedor'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {s.cardType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate" title={s.cardName}>
                        {s.cardName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {s.taxId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{s.phone}</div>
                        {s.email && s.email !== '—' && (
                          <div className="text-[10.5px] text-slate-400 truncate max-w-[150px]" title={s.email}>
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{s.city}</div>
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[180px]" title={s.address}>
                          {s.address}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap bg-slate-100/40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBalancePartner(s);
                          }}
                          className="font-mono font-extrabold text-slate-950 hover:text-amber-800 hover:underline flex items-center justify-end gap-1 w-full text-right transition"
                          title="Ver detalle de saldo de cuenta (últimos 6 meses por defecto)"
                        >
                          <span>{s.currency} {s.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-amber-600 transition" />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            s.status === 'Activo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPartnerCode(s.cardCode);
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white transition shadow-2xs"
                          title="Ver ficha completa de datos maestros de SAP"
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

          {/* Server Pagination Navigation Bar */}
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
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950"
                title="Página siguiente"
              >
                <span>Siguiente ({serverLimit} más)</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPartnerCode && (
        <BusinessPartnerDetailModal
          cardCode={selectedPartnerCode}
          onClose={() => setSelectedPartnerCode(null)}
        />
      )}

      {/* Account Balance Modal */}
      {balancePartner && (
        <AccountBalanceModal
          cardCode={balancePartner.cardCode}
          cardName={balancePartner.cardName}
          currency={balancePartner.currency}
          currentBalance={balancePartner.balance}
          onClose={() => setBalancePartner(null)}
        />
      )}
    </div>
  );
};
