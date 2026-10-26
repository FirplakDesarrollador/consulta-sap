'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { LookupOption } from '@/types/sapBusiness';

interface SapLookupInputProps {
  type: 'suppliers' | 'items' | 'warehouses' | 'landed-cost-codes';
  value: string;
  onChange: (code: string, option?: LookupOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Campo con autocompletado contra /api/sap/lookups/[type] (solo lectura en SAP) */
export const SapLookupInput: React.FC<SapLookupInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const boxRef = useRef<HTMLDivElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setTerm(value);
  }

  useEffect(() => {
    if (!open) return;
    const minLen = type === 'warehouses' || type === 'landed-cost-codes' ? 0 : 2;
    if (term.trim().length < minLen) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sap/lookups/${type}?search=${encodeURIComponent(term.trim())}`, { signal: ctrl.signal });
        const json = await res.json();
        setOptions(json.success && Array.isArray(json.data) ? json.data : []);
      } catch {
        // búsqueda cancelada o error de red
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, open, type]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          onChange(e.target.value.trim());
        }}
        className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 font-mono"
      />
      {loading && <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-600" />}
      {open && options.length > 0 && (
        <ul className="absolute z-[80] mt-1 w-full min-w-[280px] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl text-xs">
          {options.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                onClick={() => {
                  setTerm(o.code);
                  onChange(o.code, o);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                <div className="font-mono font-bold text-blue-700">{o.code}</div>
                <div className="text-slate-800">{o.name}</div>
                {o.extra && <div className="text-[10px] text-slate-500">{o.extra}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
