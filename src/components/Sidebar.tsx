'use client';

import React from 'react';
import {
  FileText,
  Boxes,
  CreditCard,
  Activity,
  BarChart3,
  Layers,
  ArrowRightLeft,
  Settings,
  HelpCircle
} from 'lucide-react';

export type ActiveTab = 'documents' | 'stock' | 'accounting' | 'stats' | 'monitor';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  documentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  documentCount
}) => {
  const menuItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string | number; desc: string }[] = [
    {
      id: 'documents',
      label: 'Documentos & Flujo',
      icon: FileText,
      badge: documentCount,
      desc: 'SD, MM, FI, Entregas y Facturas'
    },
    {
      id: 'stock',
      label: 'Consulta de Stock',
      icon: Boxes,
      badge: 'MMBE',
      desc: 'Disponibilidad y lotes'
    },
    {
      id: 'accounting',
      label: 'Partidas y Finanzas',
      icon: CreditCard,
      badge: 'FBL5N',
      desc: 'Cuentas por cobrar y pagar'
    },
    {
      id: 'stats',
      label: 'Dashboard y KPIs',
      icon: BarChart3,
      desc: 'Métricas de pedidos y facturación'
    },
    {
      id: 'monitor',
      label: 'Monitor RFC & SAP Gateway',
      icon: Activity,
      badge: 'Live',
      desc: 'Salud del conector y logs'
    }
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
            Módulos Principales
          </span>
          <nav className="mt-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all group ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isActive
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className={`font-semibold ${isActive ? 'text-blue-300' : 'text-slate-200'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick T-Codes box */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Transacciones SAP Rápidas</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/50 cursor-pointer flex justify-between items-center">
              <span className="font-mono text-blue-400">VA03</span>
              <span className="text-[10px]">Ventas</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/50 cursor-pointer flex justify-between items-center">
              <span className="font-mono text-blue-400">ME23N</span>
              <span className="text-[10px]">Compras</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/50 cursor-pointer flex justify-between items-center">
              <span className="font-mono text-blue-400">VF03</span>
              <span className="text-[10px]">Facturas</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/50 cursor-pointer flex justify-between items-center">
              <span className="font-mono text-blue-400">MMBE</span>
              <span className="text-[10px]">Stock</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>SAP S/4HANA Rel. 2023</span>
        <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
          ● JCo OK
        </span>
      </div>
    </aside>
  );
};
