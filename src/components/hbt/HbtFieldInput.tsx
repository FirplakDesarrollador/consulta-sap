'use client';

import React, { useEffect, useId, useState } from 'react';
import { HbtFieldDef, HbtRecord } from '@/types/hbt';
import { hbtInputCls } from './hbtUi';

/** Códigos de las tablas vinculadas (UDF → tabla de usuario) para el autocompletado; se piden una sola vez por tabla */
const linkedCache = new Map<string, { value: string; label: string }[] | 'loading'>();

function useLinkedOptions(table: string) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!table || linkedCache.has(table)) return;
    linkedCache.set(table, 'loading');
    fetch(`/api/sap/hbt/tables/${encodeURIComponent(table)}?limit=100`)
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: HbtRecord[] }) => {
        linkedCache.set(table, j.success && Array.isArray(j.data) ? j.data.map((r) => ({ value: r.code, label: r.name })) : []);
        force((n) => n + 1);
      })
      .catch(() => {
        linkedCache.set(table, []);
        force((n) => n + 1);
      });
  }, [table]);
  const hit = table ? linkedCache.get(table) : undefined;
  return Array.isArray(hit) ? hit : [];
}

interface Props {
  def: HbtFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  readOnlyReason?: string;
}

/** Entrada de un campo de usuario según su definición (UserFieldsMD): lista de valores válidos, tabla vinculada, número, fecha… */
export const HbtFieldInput: React.FC<Props> = ({ def, value, onChange, disabled = false, readOnlyReason }) => {
  const listId = useId();
  const linked = useLinkedOptions(def.linkedTable);
  const locked = disabled || Boolean(readOnlyReason);

  let control: React.ReactNode;
  if (def.validValues.length > 0) {
    const known = def.validValues.some((v) => v.value === value);
    control = (
      <select value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} className={hbtInputCls}>
        <option value="">—</option>
        {!known && value !== '' && <option value={value}>{value} (valor no listado)</option>}
        {def.validValues.map((v) => (
          <option key={v.value} value={v.value}>
            {v.value === v.label ? v.value : `${v.value} · ${v.label}`}
          </option>
        ))}
      </select>
    );
  } else if (def.kind === 'longtext') {
    control = <textarea value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} rows={3} className={`${hbtInputCls} font-mono`} />;
  } else if (def.kind === 'int' || def.kind === 'number' || def.kind === 'time') {
    control = (
      <input
        type="number"
        step={def.kind === 'number' ? 'any' : 1}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.kind === 'time' ? 'HHMM (ej. 1430)' : undefined}
        className={hbtInputCls}
      />
    );
  } else if (def.kind === 'date') {
    control = <input type="date" value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} className={hbtInputCls} />;
  } else {
    control = (
      <>
        <input
          type="text"
          value={value}
          disabled={locked}
          maxLength={def.size > 0 ? def.size : undefined}
          list={def.linkedTable ? listId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={hbtInputCls}
        />
        {def.linkedTable && (
          <datalist id={listId}>
            {linked.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
        )}
      </>
    );
  }

  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1">
        {def.label}
        {def.mandatory && <span className="text-rose-600"> *</span>}
        <span className="ml-1 font-mono font-medium text-slate-400">{def.name}</span>
        {def.linkedTable && <span className="ml-1 font-semibold text-indigo-500">→ {def.linkedTable}</span>}
      </label>
      {control}
      {readOnlyReason && <p className="mt-1 text-[10.5px] text-slate-500">{readOnlyReason}</p>}
    </div>
  );
};
