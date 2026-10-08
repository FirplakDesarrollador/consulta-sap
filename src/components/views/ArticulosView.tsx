'use client';

import React, { useState } from 'react';
import { Package, Search, Filter, Layers, DollarSign, Boxes } from 'lucide-react';
import { ItemMaster } from '@/types/sapBusiness';

interface ArticulosViewProps {
  articulos: ItemMaster[];
  globalFilter: string;
}

export const ArticulosView: React.FC<ArticulosViewProps> = ({ articulos, globalFilter }) => {
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  const groups = Array.from(new Set(articulos.map((a) => a.itemGroup)));

  const filtered = articulos.filter((a) => {
    const matchesGroup = selectedGroup === 'ALL' || a.itemGroup === selectedGroup;
    const q = globalFilter.toLowerCase();
    const matchesSearch =
      a.itemCode.toLowerCase().includes(q) ||
      a.itemName.toLowerCase().includes(q) ||
      a.itemGroup.toLowerCase().includes(q);
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-600" />
            <h2 className="text-base font-bold text-zinc-900">
              Maestro del Artículo: Catálogo General (OITM)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-900 border border-cyan-200">
              Modo Consulta
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consulta de artículos, unidades de medida, stock físico, comprometido, pedido y costos
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="font-semibold text-zinc-700">Grupo de Artículos:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
          >
            <option value="ALL">Todos los Grupos</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-zinc-500">
          Total: <strong className="text-zinc-800">{filtered.length}</strong> artículos
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Código Artículo</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Grupo de Artículo</th>
                <th className="py-3 px-4">Almacén Predet.</th>
                <th className="py-3 px-4 text-right">En Stock</th>
                <th className="py-3 px-4 text-right">Comprometido</th>
                <th className="py-3 px-4 text-right">Solicitado</th>
                <th className="py-3 px-4 text-right">Disponible</th>
                <th className="py-3 px-4 text-right">Costo Prom.</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filtered.map((a) => (
                <tr key={a.itemCode} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-700">{a.itemCode}</td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{a.itemName}</td>
                  <td className="py-3 px-4 text-zinc-600">{a.itemGroup}</td>
                  <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{a.defaultWhs}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    {a.onHand} <span className="text-[10px] text-zinc-500 font-normal">{a.invntryUom}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700">{a.isCommited}</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-700">{a.onOrder}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    {a.available}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-700">
                    {a.currency} {a.avgCost.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    {a.currency} {a.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
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
