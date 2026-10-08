'use client';

import React from 'react';
import { Database, Search, Bell, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { SAPSystemHealth } from '../types/sap';

interface NavbarProps {
  systemHealth: SAPSystemHealth;
  environment: 'PRD' | 'QAS' | 'DEV';
  onEnvironmentChange: (env: 'PRD' | 'QAS' | 'DEV') => void;
  globalSearch: string;
  onGlobalSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemHealth,
  environment,
  onEnvironmentChange,
  globalSearch,
  onGlobalSearchChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Consulta SAP <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">S/4HANA Hub</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Portal Unificado de Consulta y Trazabilidad de Documentos ERP
            </p>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por doc. (1000849201), cliente, material o T-Code (VA03, ME23N)..."
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs lg:text-sm bg-slate-950/60 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right: Environment switcher & System status */}
        <div className="flex items-center gap-3">
          {/* Environment Selector */}
          <div className="flex items-center bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            {(['PRD', 'QAS', 'DEV'] as const).map((env) => (
              <button
                key={env}
                onClick={() => onEnvironmentChange(env)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  environment === env
                    ? env === 'PRD'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : env === 'QAS'
                      ? 'bg-amber-600 text-white shadow-sm font-semibold'
                      : 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {env}
              </button>
            ))}
          </div>

          {/* RFC Connection Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium flex items-center gap-1">
              RFC {systemHealth.latencyMs}ms
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Sincronizar con SAP RFC"
            className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-semibold text-xs">
              SAP
            </div>
            <div className="hidden xl:block text-left text-xs">
              <div className="font-semibold text-slate-200">Consultor ERP</div>
              <div className="text-slate-500">Mandante {systemHealth.client}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
