'use client';

import React from 'react';
import { ItemFieldDef } from '@/lib/itemFields';
import { ItemCatalogs, ItemFieldValue, ItemUdfDef } from '@/types/items';
import { SapLookupInput } from '../common/SapLookupInput';

export const itemInputCls =
  'w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

interface FieldProps {
  def: ItemFieldDef;
  value: ItemFieldValue;
  onChange: (v: ItemFieldValue) => void;
  catalogs: ItemCatalogs | null;
  disabled?: boolean;
}

/** Entrada para un campo estándar del maestro, según su definición en itemFields.ts */
export const ItemFieldInput: React.FC<FieldProps> = ({ def, value, onChange, catalogs, disabled = false }) => {
  const label = (
    <label className="block text-[11px] font-bold text-slate-600 mb-1">
      {def.label}
      {def.required && <span className="text-rose-600"> *</span>}
      {def.createOnly && <span className="ml-1 font-semibold text-slate-400">(solo al crear)</span>}
    </label>
  );

  let control: React.ReactNode;
  const lookupOptions: { value: string; label: string }[] | null = (() => {
    if (!catalogs) return null;
    switch (def.lookup) {
      case 'itemGroups':
        return catalogs.itemGroups.map((g) => ({ value: String(g.code), label: `${g.code} · ${g.name}` }));
      case 'manufacturers':
        return [{ value: '-1', label: '(ninguno)' }, ...catalogs.manufacturers.map((m) => ({ value: String(m.code), label: m.name }))];
      case 'uomGroups':
        return [{ value: '-1', label: 'Manual (sin grupo)' }, ...catalogs.uomGroups.map((u) => ({ value: String(u.code), label: u.name }))];
      default:
        return null;
    }
  })();

  if (def.kind === 'yesno') {
    control = (
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1.5">
        <input type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        {value === true ? 'Sí' : 'No'}
      </label>
    );
  } else if (def.kind === 'enum') {
    control = (
      <select value={String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={itemInputCls}>
        {!def.required && <option value="">—</option>}
        {def.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (def.lookup === 'warehouses' || def.lookup === 'suppliers') {
    control = (
      <SapLookupInput
        type={def.lookup}
        value={String(value)}
        onChange={(c) => onChange(c)}
        disabled={disabled}
        placeholder={def.lookup === 'warehouses' ? 'Código de almacén' : 'Código de proveedor'}
      />
    );
  } else if (lookupOptions) {
    const cur = String(value);
    const opts = cur !== '' && !lookupOptions.some((o) => o.value === cur) ? [{ value: cur, label: cur }, ...lookupOptions] : lookupOptions;
    control = (
      <select value={cur} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={itemInputCls}>
        <option value="">{def.required ? 'Seleccione…' : '—'}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (def.kind === 'longtext') {
    control = (
      <textarea value={String(value)} disabled={disabled} maxLength={def.max} rows={3} onChange={(e) => onChange(e.target.value)} className={itemInputCls} />
    );
  } else if (def.kind === 'date') {
    control = <input type="date" value={String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={itemInputCls} />;
  } else if (def.kind === 'number' || def.kind === 'int') {
    control = (
      <input
        type="number"
        value={String(value)}
        disabled={disabled}
        step={def.kind === 'int' ? 1 : 'any'}
        min={def.allowNegative ? undefined : 0}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={itemInputCls}
      />
    );
  } else {
    control = <input type="text" value={String(value)} disabled={disabled} maxLength={def.max} onChange={(e) => onChange(e.target.value)} className={itemInputCls} />;
  }

  return (
    <div className={def.kind === 'longtext' ? 'sm:col-span-2' : ''}>
      {label}
      {control}
      {def.help && <div className="text-[10.5px] text-slate-400 mt-0.5">{def.help}</div>}
    </div>
  );
};

interface UdfProps {
  def: ItemUdfDef;
  value: string | number;
  onChange: (v: string | number) => void;
  disabled?: boolean;
}

/** Entrada para un campo de usuario (U_*) según su definición en UserFieldsMD */
export const ItemUdfInput: React.FC<UdfProps> = ({ def, value, onChange, disabled = false }) => {
  let control: React.ReactNode;
  if (def.validValues && def.validValues.length > 0) {
    control = (
      <select value={String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={itemInputCls}>
        <option value="">—</option>
        {def.validValues.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    );
  } else if (def.kind === 'number') {
    control = (
      <input type="number" step="any" value={String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={itemInputCls} />
    );
  } else if (def.kind === 'date') {
    control = <input type="date" value={String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={itemInputCls} />;
  } else {
    control = <input type="text" value={String(value)} disabled={disabled} maxLength={def.size} onChange={(e) => onChange(e.target.value)} className={itemInputCls} />;
  }
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1">
        {def.label}
        {def.mandatory && <span className="text-rose-600"> *</span>}
        <span className="ml-1 font-mono font-normal text-slate-400">{def.name}</span>
      </label>
      {control}
    </div>
  );
};
