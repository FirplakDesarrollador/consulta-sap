'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Boxes,
  Users,
  Package,
  Globe,
  Database,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Server,
  Tag
} from 'lucide-react';
import { ModuleCategory, SubModuleId } from '@/types/sapBusiness';

interface SidebarNavProps {
  currentSubModule: SubModuleId;
  onSelectSubModule: (id: SubModuleId) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentSubModule,
  onSelectSubModule
}) => {
  const [openSections, setOpenSections] = useState<Record<ModuleCategory, boolean>>({
    ventas: true,
    compras: true,
    inventarios: true,
    socios: true,
    articulos: true,
    hbt: true,
    querys: true
  });

  const toggleSection = (cat: ModuleCategory) => {
    setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-61px)] p-4 select-none shrink-0 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      <div className="space-y-4">
        {/* ================= 1. VENTAS ================= */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSection('ventas')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/70 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px] text-slate-800">Ventas</span>
            </div>
            {openSections.ventas ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSections.ventas && (
            <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-slate-100 ml-4">
              {[
                { id: 'ventas_facturas', label: 'Facturas', badge: 'Cons. / Trans.' },
                { id: 'ventas_pedidos', label: 'Pedidos', badge: 'Cons. / Trans.' },
                { id: 'ventas_clientes', label: 'Clientes', badge: 'Cons. / Trans.' }
              ].map((item) => {
                const isActive = currentSubModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSubModule(item.id as SubModuleId)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold tracking-tight ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 2. COMPRAS ================= */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSection('compras')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/70 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ShoppingCart className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px] text-slate-800">Compras</span>
            </div>
            {openSections.compras ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSections.compras && (
            <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-slate-100 ml-4">
              {[
                { id: 'compras_entrada', label: 'Entrada Mercancía', badge: 'Cons. / Trans.' },
                { id: 'compras_orden', label: 'Orden de Compra', badge: 'Cons. / Trans.' },
                { id: 'compras_precio_entrega', label: 'Precio de Entrega', badge: 'Landed Costs' }
              ].map((item) => {
                const isActive = currentSubModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSubModule(item.id as SubModuleId)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold tracking-tight ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 3. INVENTARIOS ================= */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSection('inventarios')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/70 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <Boxes className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px] text-slate-800">Inventarios</span>
            </div>
            {openSections.inventarios ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSections.inventarios && (
            <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-slate-100 ml-4">
              {[
                { id: 'inv_entradas', label: 'Entradas', icon: ArrowDownToLine, color: 'text-emerald-600' },
                { id: 'inv_salidas', label: 'Salidas', icon: ArrowUpFromLine, color: 'text-rose-600' },
                { id: 'inv_traslados', label: 'Traslados', icon: ArrowRightLeft, color: 'text-blue-600' },
                { id: 'inv_auditoria', label: 'Auditoría Stocks', icon: FileSpreadsheet, color: 'text-amber-600' },
                { id: 'inv_listas_precios', label: 'Lista de Precios', icon: Tag, color: 'text-purple-600' }
              ].map((item) => {
                const isActive = currentSubModule === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSubModule(item.id as SubModuleId)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= 4. SOCIOS DE NEGOCIO ================= */}
        <div>
          <button
            onClick={() => onSelectSubModule('socios_maestro')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
              currentSubModule === 'socios_maestro'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-semibold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px]">Socios de Negocios</span>
            </div>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
              Consulta
            </span>
          </button>
        </div>

        {/* ================= 5. MAESTRO DEL ARTÍCULO ================= */}
        <div>
          <button
            onClick={() => onSelectSubModule('articulos_maestro')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
              currentSubModule === 'articulos_maestro'
                ? 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-semibold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-cyan-50 text-cyan-600">
                <Package className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px]">Maestro del Artículo</span>
            </div>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
              Gestión
            </span>
          </button>
        </div>

        {/* ================= 6. LOCALIZACIÓN HBT ================= */}
        <div>
          <button
            onClick={() => onSelectSubModule('hbt_gastos_expo')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
              currentSubModule === 'hbt_gastos_expo'
                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-semibold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                <Globe className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px]">Localización HBT</span>
            </div>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold">
              Gestión
            </span>
          </button>
        </div>

        {/* ================= 7. QUERYS Y REPORTES ================= */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSection('querys')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/70 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                <Database className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-[11px] text-slate-800">Querys y Reportes</span>
            </div>
            {openSections.querys ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSections.querys && (
            <div className="mt-1 space-y-0.5 pl-3 border-l-2 border-slate-100 ml-4">
              {[
                { id: 'query_costo_pt', label: 'Costo Producto Terminado' },
                { id: 'query_facturas_cliente', label: 'Facturas Cliente Final' },
                { id: 'query_salidas_concepto', label: 'Salidas Concepto Consol.' }
              ].map((item) => {
                const isActive = currentSubModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSubModule(item.id as SubModuleId)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-6 pt-3.5 border-t border-slate-200 text-xs text-slate-400 space-y-1 bg-slate-50/50 p-2.5 rounded-xl border">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <Server className="h-3 w-3 text-slate-400" />
            <span>SAP PRD (100)</span>
          </span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Online
          </span>
        </div>
        <div className="text-[10px] text-slate-400">HBT SAP S/4HANA & B1</div>
      </div>
    </aside>
  );
};
