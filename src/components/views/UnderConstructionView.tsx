'use client';

import React from 'react';
import { Construction, Sparkles, Clock, ArrowLeft, Layers } from 'lucide-react';
import { SubModuleId } from '@/types/sapBusiness';

interface UnderConstructionViewProps {
  subModule: SubModuleId;
  onGoToInvoices: () => void;
}

const moduleNames: Record<SubModuleId, { title: string; category: string; description: string }> = {
  ventas_facturas: {
    title: 'Facturas de Deudores (OINV)',
    category: 'Ventas',
    description: 'Consulta y gestión de facturación real.'
  },
  ventas_pedidos: {
    title: 'Pedidos de Clientes (ORDR)',
    category: 'Ventas',
    description: 'Gestión de órdenes de venta y compromisos de entrega.'
  },
  ventas_clientes: {
    title: 'Directorio de Clientes (OCRD)',
    category: 'Ventas',
    description: 'Gestión de interlocutores comerciales y cartera.'
  },
  compras_entrada: {
    title: 'Entrada de Mercancías (OPDN)',
    category: 'Compras',
    description: 'Recepción física y control de calidad de insumos.'
  },
  compras_orden: {
    title: 'Órdenes de Compra (OPOR)',
    category: 'Compras',
    description: 'Aprobación y emisión de pedidos a proveedores.'
  },
  compras_precio_entrega: {
    title: 'Precios de Entrega (Landed Costs / IPDN)',
    category: 'Compras',
    description: 'Prorrateo de fletes, aranceles y nacionalización.'
  },
  inv_entradas: {
    title: 'Entradas de Inventario (OIGN)',
    category: 'Inventarios',
    description: 'Entradas por terminación de producto o ajustes.'
  },
  inv_salidas: {
    title: 'Salidas de Inventario (OIGE)',
    category: 'Inventarios',
    description: 'Consumos para producción y bajas de almacén.'
  },
  inv_traslados: {
    title: 'Traslados entre Almacenes (OWTR)',
    category: 'Inventarios',
    description: 'Transferencias físicas entre centros y bodegas.'
  },
  inv_auditoria: {
    title: 'Auditoría de Stocks (OINM)',
    category: 'Inventarios',
    description: 'Informe de existencias y valoración de inventario.'
  },
  socios_maestro: {
    title: 'Socios de Negocios (OCRD)',
    category: 'Directorio Maestro',
    description: 'Consulta de clientes, proveedores y condiciones fiscales.'
  },
  articulos_maestro: {
    title: 'Maestro del Artículo (OITM)',
    category: 'Catálogo General',
    description: 'Catálogo de artículos, listas de precios y stock.'
  },
  hbt_gastos_expo: {
    title: 'Localización HBT (Gastos Expo)',
    category: 'Comercio Exterior',
    description: 'Liquidación y descarga de gastos de exportación.'
  },
  query_costo_pt: {
    title: 'Query: Costo de Producto Terminado',
    category: 'Querys SAP',
    description: 'Desglose analítico de materia prima, mano de obra y CIF.'
  },
  query_facturas_cliente: {
    title: 'Query: Facturas Cliente Final',
    category: 'Querys SAP',
    description: 'Reporte consolidado con impuestos y estados DIAN.'
  },
  query_salidas_concepto: {
    title: 'Query: Salidas por Concepto Consolidado',
    category: 'Querys SAP',
    description: 'Agrupación contable de movimientos de salida.'
  }
};

export const UnderConstructionView: React.FC<UnderConstructionViewProps> = ({
  subModule,
  onGoToInvoices
}) => {
  const current = moduleNames[subModule] || {
    title: 'Módulo SAP',
    category: 'Sistema ERP',
    description: 'Funcionalidad en desarrollo.'
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <Construction className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {current.title}
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {current.category}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {current.description}
          </p>
        </div>

        <button
          onClick={onGoToInvoices}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-102 active:scale-98"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Ir a Facturas de SAP</span>
        </button>
      </div>

      {/* Main Construction Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center space-y-4">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-amber-500/10 via-amber-500/20 to-orange-500/20 border border-amber-300 flex items-center justify-center text-amber-600 shadow-inner">
          <Construction className="h-10 w-10 animate-bounce" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Módulo en Construcción
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            El módulo <strong className="text-slate-800">{current.title}</strong> se encuentra actualmente en desarrollo y fase de integración con el Service Layer de SAP Business One.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200/80 font-semibold">
          <Clock className="h-4 w-4 text-amber-600" />
          <span>Próximamente disponible con conexión en tiempo real a Firplak_SA</span>
        </div>

        <div className="pt-4">
          <button
            onClick={onGoToInvoices}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            Volver a Consulta de Facturas
          </button>
        </div>
      </div>
    </div>
  );
};
