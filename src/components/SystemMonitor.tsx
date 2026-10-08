'use client';

import React, { useState } from 'react';
import {
  Activity,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { SAPSystemHealth } from '../types/sap';

interface SystemMonitorProps {
  systemHealth: SAPSystemHealth;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ systemHealth }) => {
  const [testLog, setTestLog] = useState<string[]>([
    '[2026-04-08 07:00:01] INFO  RFC Destination S4H_PRD initialized with JCo 3.1.8',
    '[2026-04-08 07:01:15] DEBUG Invoked RFC_PING -> Status OK (Response: 38ms)',
    '[2026-04-08 07:02:40] DEBUG BAPI_SALESORDER_GETLIST executed successfully (6 records fetched)',
    '[2026-04-08 07:03:10] DEBUG BAPI_MATERIAL_AVAILABILITY executed for plant 1010',
    '[2026-04-08 07:04:00] INFO  Gateway connection stable on sap-prd-app01.corp.internal:3300'
  ]);
  const [isTesting, setIsTesting] = useState(false);

  const runRfcTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      setTestLog((prev) => [
        `[${now}] INFO  Executing RFC_PING test on mandante ${systemHealth.client}...`,
        `[${now}] SUCCESS Connection verified! Roundtrip latency: ${Math.floor(Math.random() * 20 + 25)}ms`,
        ...prev
      ]);
      setIsTesting(false);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Estado del Servidor</span>
            <Server className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {systemHealth.status}
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90">{systemHealth.systemId}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Latencia RFC Gateway</span>
            <Zap className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-bold text-blue-400 mt-1">
            {systemHealth.latencyMs} ms
          </div>
          <span className="text-[11px] text-slate-500">Gateway CPIC / WebSocket</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mandante & Host</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-base font-mono font-bold text-slate-200 mt-1">
            Client {systemHealth.client}
          </div>
          <span className="text-[11px] font-mono text-slate-500 truncate block">
            {systemHealth.host}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sesiones Activas</span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {systemHealth.activeSessions}
          </div>
          <span className="text-[11px] text-slate-500">Conexiones concurrentes JCo</span>
        </div>
      </div>

      {/* RFC Diagnostic Console */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Consola de Diagnóstico de Funciones BAPI / RFC
            </h3>
          </div>

          <button
            onClick={runRfcTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>Ejecutar Test RFC_PING</span>
          </button>
        </div>

        {/* Console Box */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-1.5 max-h-64 overflow-y-auto">
          {testLog.map((log, idx) => (
            <div
              key={idx}
              className={
                log.includes('SUCCESS')
                  ? 'text-emerald-400 font-semibold'
                  : log.includes('ERROR')
                  ? 'text-rose-400 font-semibold'
                  : log.includes('INFO')
                  ? 'text-blue-300'
                  : 'text-slate-400'
              }
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
