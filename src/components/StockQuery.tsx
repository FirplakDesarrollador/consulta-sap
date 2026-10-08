'use client';

import React, { useState } from 'react';
import {
  Boxes,
  Package,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Warehouse,
  ShieldCheck
} from 'lucide-react';
import { StockItem } from '../types/sap';

interface StockQueryProps {
  stockList: StockItem[];
}

export const StockQuery: React.FC<StockQueryProps> = ({ stockList }) => {
  const [searchMaterial, setSearchMaterial] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('ALL');

  const filteredStock = stockList.filter((item) => {
    const matchesSearch =
      item.materialNumber.toLowerCase().includes(searchMaterial.toLowerCase()) ||
      item.description.toLowerCase().includes(searchMaterial.toLowerCase());

    const matchesPlant = selectedPlant === 'ALL' || item.plant === selectedPlant;
    return matchesSearch && matchesPlant;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Consulta de Stocks por Centro y Lote (T-Code: MMBE / MD04)
              </h3>
              <p className="text-xs text-slate-400">
                Visualice stock de libre utilización, control de calidad, bloqueado y en tránsito
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código de material (MAT-...) o descripción..."
              value={searchMaterial}
              onChange={(e) => setSearchMaterial(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los Centros (WERKS)</option>
              <option value="1010">1010 - Planta Principal Bogotá</option>
              <option value="1020">1020 - Centro Logístico Norte</option>
              <option value="2010">2010 - Centro Manizales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredStock.map((item) => {
          const totalStock =
            item.unrestrictedStock + item.qualityInspection + item.blockedStock + item.inTransit;
          const totalValuation = totalStock * item.baseValuationPrice;

          return (
            <div
              key={`${item.materialNumber}-${item.plant}-${item.storageLocation}`}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-4 hover:border-slate-700 transition"
            >
              {/* Item Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-white">
                      {item.materialNumber}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                      Tipo: {item.materialType}
                    </span>
                    <span className="text-xs text-slate-400">
                      Centro <strong className="text-slate-200">{item.plant}</strong> ({item.plantName})
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300">{item.description}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-slate-500" />
                    <span>Almacén: <strong className="text-slate-300">{item.storageLocation}</strong> ({item.storageName})</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Valoración Total Stock</span>
                  <div className="text-base font-mono font-bold text-emerald-400">
                    {item.currency} {totalValuation.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Precio Base: {item.currency} {item.baseValuationPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })} / {item.unit}
                  </span>
                </div>
              </div>

              {/* Stock Breakdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Libre Utilización</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {item.unrestrictedStock} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Control de Calidad (QI)</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {item.qualityInspection} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Stock Bloqueado</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {item.blockedStock} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40">
                  <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                    <Package className="h-3.5 w-3.5" />
                    <span>En Tránsito</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {item.inTransit} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </div>
                </div>
              </div>

              {/* Batches breakdown if any */}
              {item.batches && item.batches.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    <span>Desglose por Lotes (CHRG / MCHA):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {item.batches.map((batch) => (
                      <div
                        key={batch.batchNumber}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-200">{batch.batchNumber}</div>
                          <div className="text-[10px] text-slate-500">Caducidad: {batch.expiryDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold text-white">
                            {batch.quantity} {item.unit}
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              batch.status === 'Libre'
                                ? 'text-emerald-400 bg-emerald-950'
                                : 'text-amber-400 bg-amber-950'
                            }`}
                          >
                            {batch.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
