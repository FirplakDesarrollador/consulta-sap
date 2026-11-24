'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, FlaskConical, ShieldAlert } from 'lucide-react';
import { WriteResult } from '@/lib/comprasApi';

/** Muestra el resultado de una escritura: éxito, error de SAP, simulación o escrituras deshabilitadas */
export const WriteFeedback: React.FC<{ result: WriteResult | null }> = ({ result }) => {
  if (!result) return null;
  const tone = result.dryRun
    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
    : result.writesDisabled
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : result.ok
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : 'bg-rose-50 border-rose-200 text-rose-900';
  const Icon = result.dryRun ? FlaskConical : result.writesDisabled ? ShieldAlert : result.ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`p-3 rounded-xl border text-xs space-y-2 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="font-semibold break-words">{result.message}</div>
      </div>
      {result.request && (
        <details className="text-[11px]" open={result.dryRun}>
          <summary className="cursor-pointer font-bold">
            Petición al Service Layer: {result.request.method} {result.request.path}
          </summary>
          {result.request.body !== null && result.request.body !== undefined && (
            <pre className="mt-1 p-2 rounded-lg bg-slate-950 text-emerald-300 overflow-x-auto max-h-56">
              {JSON.stringify(result.request.body, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
};
