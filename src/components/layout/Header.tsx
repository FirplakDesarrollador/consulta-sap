'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Command,
  Server
} from 'lucide-react';
import { SubModuleId } from '@/types/sapBusiness';

interface HeaderProps {
  currentSubModule: SubModuleId;
  globalFilter: string;
  onGlobalFilterChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentSubModule,
  globalFilter,
  onGlobalFilterChange,
  onRefresh,
  isRefreshing,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    companyDB: string;
    user: string;
    latencyMs: number;
    error?: string;
  }>({
    connected: true,
    companyDB: 'Firplak_SA',
    user: 'manager',
    latencyMs: 42
  });

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/sap/status');
      if (res.ok) {
        const json = await res.json();
        setConnectionStatus({
          connected: json.connected,
          companyDB: json.companyDB || 'Firplak_SA',
          user: json.user || 'manager',
          latencyMs: json.latencyMs || 45,
          error: json.error
        });
      }
    } catch {
      // Keep optimistic status
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between gap-4 shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/30">
          <Database className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[15px] text-slate-900 tracking-tight">
              Consulta SAP
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 uppercase tracking-wide">
              {connectionStatus.companyDB}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Service Layer v1 • Conectado a {connectionStatus.companyDB}
          </p>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-lg hidden md:block">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por código de artículo, documento SAP, NIT, razón social..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="w-full pl-10 pr-16 py-2 text-xs bg-slate-100/70 border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-mono text-slate-500 border border-slate-300/50">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right: Actions and Status */}
      <div className="flex items-center gap-3">
        {/* Connection status pill */}
        <div
          title={connectionStatus.error || `Service Layer OK (${connectionStatus.latencyMs}ms)`}
          className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition ${
            connectionStatus.connected
              ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
              : 'bg-amber-50 border-amber-200/80 text-amber-700'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="font-mono text-[11px]">
            {connectionStatus.connected ? `B1 Service Layer (${connectionStatus.latencyMs}ms)` : 'SAP Modo Contingencia'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => {
            onRefresh();
            checkConnection();
          }}
          title="Sincronizar con servidor SAP"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200 transition-all hover:scale-105 active:scale-95 shadow-xs"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Notification Bell */}
        <button
          title="Notificaciones del sistema"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200 transition relative shadow-xs"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            FP
          </div>
          <div className="hidden xl:block text-left text-xs">
            <div className="font-bold text-slate-800 leading-tight">Firplak S.A.</div>
            <div className="text-slate-400 text-[10px] font-mono">Usuario: {connectionStatus.user}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
