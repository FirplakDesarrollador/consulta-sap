'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Building,
  TrendingDown
} from 'lucide-react';
import { OpenItemFI } from '../types/sap';

interface AccountingQueryProps {
  openItems: OpenItemFI[];
}

export const AccountingQuery: React.FC<AccountingQueryProps> = ({ openItems }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = openItems.filter((item) => {
    const matchesSearch =
      item.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.docNumber.includes(searchTerm) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalOpen = openItems
    .filter((i) => i.status === 'Abierta' && i.currency === 'USD')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalOverdue = openItems
    .filter((i) => i.status === 'Vencida')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Partidas Abiertas (USD)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            USD {totalOpen.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Pendiente de pago en cartera</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-900/40 shadow-md">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Partidas Vencidas</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-bold text-rose-300 mt-1">
            COP {totalOverdue.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-rose-400/80">Requiere gestión de cobranza (F110/FBL5N)</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mandante & Sociedad</span>
            <Building className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-slate-200 mt-1">
            Sociedades 1000 / 2000
          </div>
          <span className="text-[10px] text-slate-500">Cuentas por Cobrar & Pagar FI-AR/AP</span>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Partidas Individuales de Deudores / Acreedores (FBL5N / FBL1N)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
            >
              <option value="ALL">Todas las Partidas</option>
              <option value="Abierta">Partidas Abiertas (Rojas)</option>
              <option value="Vencida">Partidas Vencidas</option>
              <option value="Compensada">Partidas Compensadas (Verdes)</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cuenta, nombre de cliente, documento o referencia de factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Estado FI</th>
                <th className="py-3 px-4">Doc. Contable</th>
                <th className="py-3 px-4">Cuenta Deudor</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Fecha Contab.</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4 text-right">Importe</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4">Compensación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === 'Compensada'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'Vencida'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{item.docNumber}</td>
                  <td className="py-3 px-4 font-mono text-blue-400">{item.account}</td>
                  <td className="py-3 px-4 text-slate-200">{item.accountName}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{item.postingDate}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{item.dueDate}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {item.currency} {item.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{item.reference}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {item.clearingDoc ? `${item.clearingDoc} (${item.clearingDate})` : '—'}
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
