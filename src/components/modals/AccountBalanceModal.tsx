'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  RefreshCw,
  AlertCircle,
  Download,
  Search,
  Filter,
  CreditCard,
  Building2,
  FileText,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface AccountBalanceItem {
  lineNum: number;
  transId: number;
  lineId: number;
  refDate: string;
  dueDate: string;
  taxDate: string;
  transType: number;
  transTypeLabel: string;
  transTypeShort: string;
  baseRef: string;
  contraAct: string;
  lineMemo: string;
  debit: number;
  credit: number;
  netAmount: number;
  fcDebit: number;
  fcCredit: number;
  fcCurrency: string;
  balDueDeb: number;
  balDueCred: number;
}

interface AccountBalanceModalProps {
  cardCode: string;
  cardName: string;
  currency: string;
  currentBalance: number;
  onClose: () => void;
}

export const AccountBalanceModal: React.FC<AccountBalanceModalProps> = ({
  cardCode,
  cardName,
  currency,
  currentBalance,
  onClose
}) => {
  // Periods: default 6 months as requested by user
  const [selectedMonths, setSelectedMonths] = useState<number>(6);
  
  // Date range inputs (defaults to 6 months ago -> today)
  const calculateDefaultStartDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(calculateDefaultStartDate(6));
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [items, setItems] = useState<AccountBalanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side quick search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const fetchBalanceDetail = async (start: string, end: string, months: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      params.set('months', String(months));

      const res = await fetch(`/api/sap/business-partners/${encodeURIComponent(cardCode)}/account-balance?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      } else {
        setError(json.error || 'Error al obtener el detalle de saldo de cuenta');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con SAP');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceDetail(startDate, endDate, selectedMonths);
  }, [cardCode]);

  // Handle quick period preset selection
  const handlePresetSelect = (months: number) => {
    setSelectedMonths(months);
    const newStart = calculateDefaultStartDate(months);
    setStartDate(newStart);
    setEndDate(todayStr);
    fetchBalanceDetail(newStart, todayStr, months);
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBalanceDetail(startDate, endDate, selectedMonths);
  };

  // Filtered rows
  const filteredItems = items.filter((item) => {
    if (onlyOpen && item.balDueDeb === 0 && item.balDueCred === 0) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.baseRef.toLowerCase().includes(q) ||
      item.transTypeLabel.toLowerCase().includes(q) ||
      item.contraAct.toLowerCase().includes(q) ||
      item.lineMemo.toLowerCase().includes(q) ||
      String(item.transId).includes(q)
    );
  });

  // Calculate totals for filtered items
  const totalDebit = filteredItems.reduce((acc, it) => acc + it.debit, 0);
  const totalCredit = filteredItems.reduce((acc, it) => acc + it.credit, 0);
  const totalNet = totalDebit - totalCredit;

  const handleExportCSV = () => {
    const headers = 'Num,FechaContab,FechaVenc,Origen,NumOrigen,CuentaContrapartida,InfoDetallada,Debito,Credito,Neto\n';
    const rows = filteredItems.map(
      (r) =>
        `${r.lineNum},"${r.refDate}","${r.dueDate}","${r.transTypeShort}","${r.baseRef}","${r.contraAct}","${r.lineMemo.replace(/"/g, '""')}",${r.debit},${r.credit},${r.netAmount}`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SaldoCuenta_${cardCode}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-xs">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-lg font-bold tracking-tight text-white">
                    Saldo de cuenta - {cardCode}
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    JDT1 / OJDT SAP B1
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {cardName} • Movimientos contables del extracto de cuenta
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredItems.length > 0 && (
              <button
                onClick={handleExportCSV}
                title="Exportar a CSV / Excel"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Period Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Period Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Periodo:
              </span>
              {[
                { label: 'Últimos 3 meses', months: 3 },
                { label: 'Últimos 6 meses (Por defecto)', months: 6 },
                { label: 'Último año (12 meses)', months: 12 },
                { label: 'Últimos 2 años', months: 24 },
                { label: 'Últimos 5 años', months: 60 }
              ].map((preset) => {
                const isActive = selectedMonths === preset.months;
                return (
                  <button
                    key={preset.months}
                    onClick={() => handlePresetSelect(preset.months)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Total Balance Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Saldo Total SAP:</span>
              <span className={`font-mono text-sm font-extrabold ${
                currentBalance < 0 ? 'text-rose-600' : currentBalance > 0 ? 'text-emerald-600' : 'text-slate-800'
              }`}>
                {currency} {currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Custom Date Form & Quick Search */}
          <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Fecha Contabilización Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Fecha Contabilización Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-3.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5 h-[30px]"
            >
              {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Consultar Fecha</span>
            </button>

            {/* Quick in-table search */}
            <div className="flex-1 min-w-[200px] relative">
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Filtrar en resultados</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="N° origen, cuenta, detalle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 h-[30px]"
                />
              </div>
            </div>

            {/* Checkbox only open */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 pb-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Solo no reconciliadas / con saldo</span>
            </label>
          </form>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-xs font-semibold text-slate-600">
                Consultando movimientos de saldo de cuenta en SAP Service Layer...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchBalanceDetail(startDate, endDate, selectedMonths)}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold"
              >
                Reintentar
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl text-xs font-medium">
              No se encontraron movimientos contables en el rango de fechas seleccionado ({startDate} a {endDate}).
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-2.5 px-3 text-center">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Fecha Contab.</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Vencimiento</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Origen</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">N° Origen</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Contrapartida</th>
                      <th className="py-2.5 px-3">Info. Detallada</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Débito (ML)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Crédito (ML)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">C/D Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredItems.map((item, idx) => {
                      const isDebit = item.debit > 0;
                      return (
                        <tr
                          key={`${item.transId}-${item.lineId}-${idx}`}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {item.lineNum}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                            {item.refDate}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {item.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold border ${
                                item.transTypeShort === 'FC' || item.transTypeShort === 'FP'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.transTypeShort === 'PE' || item.transTypeShort === 'PR'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.transTypeShort === 'NC' || item.transTypeShort === 'NP'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={item.transTypeLabel}
                            >
                              {item.transTypeShort}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {item.baseRef}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {item.contraAct}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate text-[11px]" title={item.lineMemo}>
                            {item.lineMemo}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                            {item.debit > 0 ? item.debit.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                            {item.credit > 0 ? item.credit.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            item.netAmount > 0 ? 'text-emerald-700' : item.netAmount < 0 ? 'text-rose-700' : 'text-slate-500'
                          }`}>
                            {item.netAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="px-6 py-3.5 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              Mostrando <strong className="text-slate-900">{filteredItems.length}</strong> operaciones contables
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Rango: <strong className="text-slate-900">{startDate}</strong> a <strong className="text-slate-900">{endDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[11px] font-semibold block">Total Débitos:</span>
              <span className="font-bold text-slate-900">
                {currency} {totalDebit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] font-semibold block">Total Créditos:</span>
              <span className="font-bold text-slate-900">
                {currency} {totalCredit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pl-3 border-l border-slate-300">
              <span className="text-slate-500 text-[11px] font-semibold block">Neto Periodo:</span>
              <span className={`font-extrabold text-sm ${totalNet < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currency} {totalNet.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
