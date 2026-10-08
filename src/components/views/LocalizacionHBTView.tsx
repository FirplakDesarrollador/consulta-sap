'use client';

import React, { useState } from 'react';
import { Globe, Download, FileSpreadsheet, Filter, CheckCircle2, Clock, DollarSign, Layers } from 'lucide-react';
import { HBTExpenseExpo } from '@/types/sapBusiness';

interface LocalizacionHBTViewProps {
  expenses: HBTExpenseExpo[];
  globalFilter: string;
}

export const LocalizacionHBTView: React.FC<LocalizacionHBTViewProps> = ({
  expenses,
  globalFilter
}) => {
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filtered = expenses.filter((e) => {
    const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
    const q = globalFilter.toLowerCase();
    const matchesSearch =
      e.exportOrderNum.toLowerCase().includes(q) ||
      e.customsDeclaration.toLowerCase().includes(q) ||
      e.expenseConcept.toLowerCase().includes(q) ||
      e.providerName.toLowerCase().includes(q) ||
      e.invoiceNumber.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalCOP = filtered.reduce((acc, curr) => acc + curr.expenseAmountCOP, 0);
  const totalUSD = filtered.reduce((acc, curr) => acc + curr.expenseAmountUSD, 0);

  const handleDownloadExcel = () => {
    const headers = [
      'OrdenExpo,DeclaracionAduana,Concepto,NITProveedor,Proveedor,Factura,Fecha,FOB_USD,Gasto_COP,Gasto_USD,TRM,Estado\n'
    ];
    const rows = filtered.map((e) =>
      `"${e.exportOrderNum}","${e.customsDeclaration}","${e.expenseConcept}","${e.providerTaxId}","${e.providerName}","${e.invoiceNumber}","${e.date}",${e.fobValueUSD},${e.expenseAmountCOP},${e.expenseAmountUSD},${e.exchangeRate},"${e.status}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HBT_Gastos_Exportacion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-zinc-900">
              Localización HBT: Descarga de Gastos de Exportación (Expo)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200">
              Módulo HBT LATAM
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consolidado y descarga para prorrateo de fletes, agenciamiento aduanero y gastos conexos
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Download className="h-4 w-4" />
          <span>Descargar Gastos Expo (Excel / CSV)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white border border-zinc-200 rounded-xl">
          <div className="text-xs text-zinc-500 font-medium">Total Gastos Expo (COP)</div>
          <div className="text-lg font-mono font-bold text-zinc-900 mt-1">
            COP ${totalCOP.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-xl">
          <div className="text-xs text-zinc-500 font-medium">Equivalente en USD</div>
          <div className="text-lg font-mono font-bold text-indigo-700 mt-1">
            USD ${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-xl">
          <div className="text-xs text-zinc-500 font-medium">TRM Promedio de Liquidación</div>
          <div className="text-base font-mono font-bold text-zinc-800 mt-1">
            $3.904,11 COP / USD
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <span className="font-semibold text-zinc-700">Filtrar Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Descargado">Descargados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Contabilizado">Contabilizados</option>
            </select>
          </div>

          <span className="text-zinc-500">
            Total registros: <strong className="text-zinc-800">{filtered.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Orden Expo</th>
                <th className="py-3 px-4">DEX / Aduana</th>
                <th className="py-3 px-4">Concepto de Gasto</th>
                <th className="py-3 px-4">Proveedor / NIT</th>
                <th className="py-3 px-4">Factura Gasto</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Valor FOB (USD)</th>
                <th className="py-3 px-4 text-right">Gasto COP</th>
                <th className="py-3 px-4 text-right">Gasto USD</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">{e.exportOrderNum}</td>
                  <td className="py-3 px-4 font-mono text-zinc-600">{e.customsDeclaration}</td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{e.expenseConcept}</td>
                  <td className="py-3 px-4 text-zinc-600 text-[11px]">
                    <div>{e.providerName}</div>
                    <div className="text-zinc-400 font-mono">{e.providerTaxId}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-600">{e.invoiceNumber}</td>
                  <td className="py-3 px-4 text-zinc-600">{e.date}</td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-700">
                    ${e.fobValueUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    ${e.expenseAmountCOP.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                    ${e.expenseAmountUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        e.status === 'Descargado' || e.status === 'Contabilizado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
