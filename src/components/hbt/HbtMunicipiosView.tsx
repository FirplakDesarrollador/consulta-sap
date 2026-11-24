'use client';

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtRecord } from '@/types/hbt';
import { HbtTableBrowser } from './HbtTableBrowser';
import { ErrorBox, hbtCardCls } from './hbtUi';

interface Props {
  refreshKey?: number;
}

/**
 * Municipios y departamentos: los departamentos salen de BPCO_DEP (código DANE de 2 dígitos) y los municipios de HBT_MUNICIPIO
 * (código DANE de 5 dígitos: los 2 primeros son el departamento). Se pueden crear, editar y eliminar municipios.
 */
export const HbtMunicipiosView: React.FC<Props> = ({ refreshKey = 0 }) => {
  const [dept, setDept] = useState('');
  const depQ = useSapQuery<HbtRecord[]>('/api/sap/hbt/tables/BPCO_DEP?limit=100', [refreshKey]);
  const deps = Array.isArray(depQ.data) ? depQ.data : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-extrabold text-slate-900">Municipios y departamentos</h3>
        <span className="text-[11px] font-semibold text-slate-500">@HBT_MUNICIPIO (municipios ICA / medios magnéticos) · departamentos de @BPCO_DEP</span>
      </div>
      <ErrorBox message={depQ.error} />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className={`${hbtCardCls} max-h-[560px] overflow-y-auto space-y-1`}>
          <button
            onClick={() => setDept('')}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold ${dept === '' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            Todos los departamentos
          </button>
          {depQ.isLoading && <p className="px-3 py-2 text-xs text-slate-500">Consultando…</p>}
          {deps.map((d) => (
            <button
              key={d.code}
              onClick={() => setDept(d.code)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 ${dept === d.code ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <span className="truncate">{d.name}</span>
              <span className="font-mono text-[10.5px] opacity-70">{d.code}</span>
            </button>
          ))}
        </div>
        <HbtTableBrowser key={dept} table="HBT_MUNICIPIO" refreshKey={refreshKey} fixedPrefix={dept} compact newLabel="Nuevo municipio" newCodeHint={dept} />
      </div>
    </div>
  );
};
