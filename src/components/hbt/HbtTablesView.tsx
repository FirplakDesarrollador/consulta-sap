'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Hash, RefreshCw, Database } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtCategoryInfo, HbtTableInfo } from '@/types/hbt';
import { HbtTableBrowser } from './HbtTableBrowser';
import { ErrorBox, hbtCardCls, hbtInputCls, MODE_BADGE } from './hbtUi';

interface Props {
  refreshKey?: number;
  globalFilter?: string;
  /** Tabla abierta desde otra pestaña (p. ej. el resumen) */
  initialTable?: string | null;
  /** Categoría preseleccionada (p. ej. desde el resumen) */
  initialCategory?: string | null;
}

interface Directory {
  categories: (HbtCategoryInfo & { tables: number })[];
  tables: HbtTableInfo[];
  withoutEntity: { name: string; description: string; type: string }[];
}

/** Directorio de las tablas de usuario de Localización HBT por categoría, con conteo de filas bajo demanda */
export const HbtTablesView: React.FC<Props> = ({ refreshKey = 0, globalFilter = '', initialTable = null, initialCategory = null }) => {
  const [category, setCategory] = useState(initialCategory || 'catalogos');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(initialTable);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [counting, setCounting] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [prevGlobal, setPrevGlobal] = useState(globalFilter);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (globalFilter !== prevGlobal) {
    setPrevGlobal(globalFilter);
    setSearch(globalFilter);
  }

  const dirQ = useSapQuery<HbtTableInfo[]>('/api/sap/hbt/tables', [refreshKey]);
  const dir: Directory | null = dirQ.json
    ? { categories: (dirQ.json.categories as Directory['categories']) ?? [], tables: dirQ.data ?? [], withoutEntity: (dirQ.json.withoutEntity as Directory['withoutEntity']) ?? [] }
    : null;

  const term = search.trim().toLowerCase();
  const list = (dir?.tables ?? []).filter((t) => (term ? t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term) : t.category === category));

  /** Cuenta las filas de la categoría: el servidor responde con un presupuesto de tiempo (pending) y se repite hasta terminar */
  const countCategory = useCallback(async () => {
    setCounting(true);
    setCountError(null);
    try {
      for (let i = 0; i < 12 && alive.current; i++) {
        const res = await fetch(`/api/sap/hbt/tables?category=${encodeURIComponent(category)}&counts=1`);
        const json = (await res.json()) as { success: boolean; data?: HbtTableInfo[]; pending?: number; error?: string };
        if (!json.success || !json.data) {
          setCountError(json.error || 'No se pudo contar las filas');
          break;
        }
        const next: Record<string, number | null> = {};
        for (const t of json.data) if (t.count !== undefined) next[t.name] = t.count;
        if (alive.current) setCounts((c) => ({ ...c, ...next }));
        if (!json.pending) break;
      }
    } catch (e) {
      setCountError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      if (alive.current) setCounting(false);
    }
  }, [category]);

  if (open) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpen(null)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al directorio
        </button>
        <HbtTableBrowser table={open} refreshKey={refreshKey} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 max-w-md">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar tabla (en todas las categorías)</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o descripción" className={`${hbtInputCls} pl-8`} />
          </div>
        </div>
        {!term && (
          <button onClick={countCategory} disabled={counting || !dir} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            {counting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />} Contar filas de la categoría
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(dir?.categories ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              setSearch('');
            }}
            title={c.description}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!term && category === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
          >
            {c.label} <span className="opacity-70">({c.tables})</span>
          </button>
        ))}
      </div>
      {!term && dir && <p className="text-xs text-slate-500">{dir.categories.find((c) => c.id === category)?.description}</p>}

      <ErrorBox message={dirQ.error || countError} />
      {dirQ.isLoading && <p className="text-xs text-slate-500">Consultando el directorio de tablas en SAP…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((t) => {
          const n = counts[t.name] ?? t.count;
          return (
            <button key={t.name} onClick={() => setOpen(t.name)} className={`${hbtCardCls} text-left hover:border-indigo-300 hover:shadow-md transition`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{t.description}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">@{t.name}</div>
                </div>
                <Database className="h-4 w-4 text-indigo-400 shrink-0" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${MODE_BADGE[t.mode].cls}`}>{MODE_BADGE[t.mode].label}</span>
                <span className="text-[11px] font-bold text-slate-600">{n === undefined ? '' : n === null ? 'n/d' : `${n.toLocaleString('es-ES')} filas`}</span>
              </div>
            </button>
          );
        })}
        {!dirQ.isLoading && list.length === 0 && <p className="text-xs text-slate-500">No hay tablas para mostrar.</p>}
      </div>

      {dir && dir.withoutEntity.length > 0 && !term && category === 'mm' && (
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600">
          Tablas del complemento que no se pueden consultar por el Service Layer (documento / líneas sin objeto de usuario registrado):{' '}
          {dir.withoutEntity.map((t) => t.name).join(', ')}.
        </div>
      )}
    </div>
  );
};
