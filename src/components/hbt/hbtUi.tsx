'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { HbtFieldDef, HbtMode, HbtValue } from '@/types/hbt';
import { LinkifiedText } from '@/components/common/LinkifiedText';

export const hbtInputCls =
  'w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

export const hbtCardCls = 'bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]';

export const MODE_BADGE: Record<HbtMode, { label: string; cls: string }> = {
  crud: { label: 'Crear · editar · eliminar', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  config: { label: 'Configuración (crear · editar · eliminar)', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  patch: { label: 'Solo edición', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  readonly: { label: 'Solo lectura', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
};

/** Indicador de si el entorno permite escribir en SAP (SAP_ALLOW_WRITES) */
export const WritesBadge: React.FC<{ enabled: boolean | null }> = ({ enabled }) => {
  if (enabled === null) return null;
  return enabled ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="h-3 w-3" /> Escritura habilitada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
      <ShieldAlert className="h-3 w-3" /> Solo simulación (SAP_ALLOW_WRITES desactivado)
    </span>
  );
};

export const Pager: React.FC<{
  page: number;
  hasMore: boolean;
  total: number | null;
  count: number;
  limit: number;
  onPage: (p: number) => void;
}> = ({ page, hasMore, total, count, limit, onPage }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
    <span>
      {total !== null ? `${total.toLocaleString('es-ES')} registros` : `${count} registros`} · página {page}
      {total !== null && total > 0 ? ` de ${Math.max(1, Math.ceil(total / limit))}` : ''}
    </span>
    <div className="flex items-center gap-1">
      <button onClick={() => onPage(1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40" aria-label="Primera página">
        <ChevronsLeft className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40" aria-label="Página anterior">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onPage(page + 1)} disabled={!hasMore} className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40" aria-label="Página siguiente">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

export const ErrorBox: React.FC<{ message: string | null }> = ({ message }) =>
  message ? <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 font-semibold break-words">{message}</div> : null;

/** Texto legible de un valor de campo (usa la lista de valores válidos si existe) */
export function displayValue(def: HbtFieldDef | undefined, v: HbtValue | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  const hit = def?.validValues.find((x) => x.value === s);
  return hit && hit.label !== s ? `${s} · ${hit.label}` : s;
}

/** Valor de campo como texto; las URLs http/https son enlaces (nueva pestaña) y se parten para no desbordar */
export const ValueText: React.FC<{ def: HbtFieldDef | undefined; value: HbtValue | undefined; className?: string }> = ({ def, value, className }) => (
  <LinkifiedText text={displayValue(def, value)} className={className} />
);

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
