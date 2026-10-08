'use client';

import React, { useState } from 'react';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  FileSpreadsheet,
  Warehouse,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { InventoryMovement, ItemMaster } from '@/types/sapBusiness';

interface InventariosViewProps {
  subModule: 'inv_entradas' | 'inv_salidas' | 'inv_traslados' | 'inv_auditoria';
  movements: InventoryMovement[];
  articulos: ItemMaster[];
  globalFilter: string;
}

export const InventariosView: React.FC<InventariosViewProps> = ({
  subModule,
  movements,
  articulos,
  globalFilter
}) => {
  const currentTitle =
    subModule === 'inv_entradas'
      ? 'Inventarios: Entradas de Mercancía / Producción (OIGN)'
      : subModule === 'inv_salidas'
      ? 'Inventarios: Salidas de Mercancía / Consumos (OIGE)'
      : subModule === 'inv_traslados'
      ? 'Inventarios: Traslados entre Almacenes (OWTR)'
      : 'Inventarios: Informe de Auditoría de Stocks (OINM)';

  const movType =
    subModule === 'inv_entradas'
      ? 'Entrada'
      : subModule === 'inv_salidas'
      ? 'Salida'
      : 'Traslado';

  const filteredMovements = movements.filter((m) => {
    if (subModule !== 'inv_auditoria' && m.movementType !== movType) return false;
    const q = globalFilter.toLowerCase();
    return (
      m.docNum.toLowerCase().includes(q) ||
      m.itemCode.toLowerCase().includes(q) ||
      m.itemName.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q)
    );
  });

  const filteredArticulos = articulos.filter((a) => {
    const q = globalFilter.toLowerCase();
    return (
      a.itemCode.toLowerCase().includes(q) ||
      a.itemName.toLowerCase().includes(q) ||
      a.itemGroup.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-bold text-zinc-900">{currentTitle}</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
              Gestión de Stock
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Trazabilidad de movimientos físicos y valoración contable de inventarios
          </p>
        </div>
      </div>

      {subModule !== 'inv_auditoria' ? (
        /* Movements Table */
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Doc. Movimiento</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Descripción</th>
                  {subModule === 'inv_traslados' ? (
                    <>
                      <th className="py-3 px-4">De Almacén</th>
                      <th className="py-3 px-4">A Almacén</th>
                    </>
                  ) : (
                    <th className="py-3 px-4">Almacén</th>
                  )}
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4">Concepto / Motivo</th>
                  <th className="py-3 px-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {filteredMovements.map((mov) => (
                  <tr key={mov.docNum} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{mov.docNum}</td>
                    <td className="py-3 px-4 text-zinc-600">{mov.docDate}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-900">{mov.itemCode}</td>
                    <td className="py-3 px-4 text-zinc-800">{mov.itemName}</td>
                    {subModule === 'inv_traslados' ? (
                      <>
                        <td className="py-3 px-4 font-semibold text-blue-600">{mov.fromWhs}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600">{mov.toWhs}</td>
                      </>
                    ) : (
                      <td className="py-3 px-4 text-zinc-600">{mov.whsCode}</td>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                      {mov.quantity} <span className="text-[10px] font-normal text-zinc-500">{mov.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                      {mov.currency} {mov.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-[11px] max-w-xs truncate">
                      {mov.reason}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">{mov.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Auditoría de Stocks */
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Código Artículo</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Grupo</th>
                  <th className="py-3 px-4 text-right">Stock Físico (En Stock)</th>
                  <th className="py-3 px-4 text-right">Comprometido</th>
                  <th className="py-3 px-4 text-right">Solicitado (OC)</th>
                  <th className="py-3 px-4 text-right">Disponible</th>
                  <th className="py-3 px-4 text-right">Costo Promedio</th>
                  <th className="py-3 px-4 text-right">Valor Total Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {filteredArticulos.map((art) => {
                  const totalVal = art.onHand * art.avgCost;
                  return (
                    <tr key={art.itemCode} className="hover:bg-zinc-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{art.itemCode}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">{art.itemName}</td>
                      <td className="py-3 px-4 text-zinc-600">{art.itemGroup}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                        {art.onHand} <span className="text-[10px] font-normal text-zinc-500">{art.invntryUom}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        {art.isCommited}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        {art.onOrder}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {art.available}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-700">
                        {art.currency} {art.avgCost.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                        {art.currency} {totalVal.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
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
  );
};
