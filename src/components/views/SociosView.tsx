'use client';

import React, { useState } from 'react';
import { Users, Search, Filter, Phone, Mail, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { BusinessPartner } from '@/types/sapBusiness';

interface SociosViewProps {
  socios: BusinessPartner[];
  globalFilter: string;
}

export const SociosView: React.FC<SociosViewProps> = ({ socios, globalFilter }) => {
  const [selectedType, setSelectedType] = useState('ALL');

  const filtered = socios.filter((s) => {
    const matchesType = selectedType === 'ALL' || s.cardType === selectedType;
    const q = globalFilter.toLowerCase();
    const matchesSearch =
      s.cardCode.toLowerCase().includes(q) ||
      s.cardName.toLowerCase().includes(q) ||
      s.taxId.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.groupName.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-zinc-900">
              Socios de Negocios: Directorio Maestro (OCRD)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
              Modo Consulta
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consulta integral de clientes, proveedores, condiciones fiscales y saldos en cartera
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="font-semibold text-zinc-700">Tipo de Socio:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
          >
            <option value="ALL">Todos (Clientes y Proveedores)</option>
            <option value="Cliente">Solo Clientes</option>
            <option value="Proveedor">Solo Proveedores</option>
          </select>
        </div>

        <span className="text-xs text-zinc-500">
          Total: <strong className="text-zinc-800">{filtered.length}</strong> socios
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">CardCode</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Razón Social / Nombre</th>
                <th className="py-3 px-4">NIT / Identificación</th>
                <th className="py-3 px-4">Grupo de Socio</th>
                <th className="py-3 px-4">Ciudad / Dirección</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4 text-right">Saldo Cuenta</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filtered.map((s) => (
                <tr key={s.cardCode} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">{s.cardCode}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        s.cardType === 'Cliente'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {s.cardType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{s.cardName}</td>
                  <td className="py-3 px-4 font-mono text-zinc-600">{s.taxId}</td>
                  <td className="py-3 px-4 text-zinc-600 text-[11px]">{s.groupName}</td>
                  <td className="py-3 px-4 text-zinc-600">
                    <div>{s.city}</div>
                    <div className="text-[10px] text-zinc-400">{s.address}</div>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 text-[11px]">
                    <div>{s.phone}</div>
                    <div className="text-zinc-400">{s.email}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    {s.currency} {s.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.status}
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
