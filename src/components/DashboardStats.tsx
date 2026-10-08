'use client';

import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  DollarSign,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { SAPDocument } from '../types/sap';

interface DashboardStatsProps {
  documents: SAPDocument[];
  onFilterByType: (type: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  documents,
  onFilterByType
}) => {
  const salesOrders = documents.filter((d) => d.type === 'SD_ORDER');
  const purchaseOrders = documents.filter((d) => d.type === 'MM_ORDER');
  const invoices = documents.filter((d) => d.type === 'SD_INVOICE');
  const deliveries = documents.filter((d) => d.type === 'SD_DELIVERY');

  const totalSalesUSD = salesOrders
    .filter((d) => d.currency === 'USD')
    .reduce((sum, d) => sum + d.grossTotal, 0);

  const totalSalesCOP = salesOrders
    .filter((d) => d.currency === 'COP')
    .reduce((sum, d) => sum + d.grossTotal, 0);

  const blockedDocs = documents.filter((d) => d.status === 'Bloqueado');

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Orders */}
        <div
          onClick={() => onFilterByType('SD_ORDER')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pedidos de Venta (SD)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3 flex items-baseline gap-2">
            {salesOrders.length}
            <span className="text-xs font-normal text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +14.2%
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            USD {totalSalesUSD.toLocaleString('es-ES', { minimumFractionDigits: 0 })} + COP ${(totalSalesCOP / 1000000).toFixed(1)}M
          </div>
        </div>

        {/* Purchase Orders */}
        <div
          onClick={() => onFilterByType('MM_ORDER')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pedidos de Compra (MM)</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            {purchaseOrders.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Abastecimiento industrial activo
          </div>
        </div>

        {/* Invoices */}
        <div
          onClick={() => onFilterByType('SD_INVOICE')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Facturación & CUFE (VF03)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3">
            {invoices.length}
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> 100% Contabilizadas en FI
          </div>
        </div>

        {/* Blocked / Critical */}
        <div
          className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/30 to-slate-950 border border-rose-900/40 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Doc. con Bloqueos</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-3">
            {blockedDocs.length}
          </div>
          <div className="text-xs text-rose-400/90 mt-1">
            Límite de crédito excedido (VKM1)
          </div>
        </div>
      </div>

      {/* Module Overview and Pipeline visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Cycle Flow Health */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Eficiencia del Flujo de Ventas (Order-to-Cash O2C)
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>1. Creación Pedido VA01/VA03</span>
                <span className="font-semibold text-emerald-400">100% Completado</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>2. Picking & Salida de Mercancías (VL01N/VL02N)</span>
                <span className="font-semibold text-blue-400">85% Entregado a tiempo</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[85%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>3. Facturación Electrónica DIAN/SAP (VF01)</span>
                <span className="font-semibold text-indigo-400">92% Sin incidencias</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[92%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>4. Compensación de Cobro FI-AR</span>
                <span className="font-semibold text-amber-400">74% Dentro del plazo</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[74%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* ERP Architecture Quick Info */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            Integración de Tablas SAP Consultadas
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-mono font-bold text-blue-400">VBAK / VBAP</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Cabecera y Posiciones de Pedidos de Venta</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-mono font-bold text-emerald-400">EKKO / EKPO</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Documentos y Líneas de Pedidos de Compra</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-mono font-bold text-purple-400">VBRK / VBRP</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Documentos de Facturación y Cuentas</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-mono font-bold text-amber-400">BKPF / BSEG</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Cabecera y Partidas del Libro Mayor FI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
