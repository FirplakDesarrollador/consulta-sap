'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Save, FlaskConical } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { sapWrite, WriteResult } from '@/lib/comprasApi';
import { ITEM_FIELDS, ITEM_SECTION_LABEL, ItemSection, emptyFieldValue } from '@/lib/itemFields';
import { ItemCatalogs, ItemDetail, ItemFieldValue } from '@/types/items';
import { WriteFeedback } from '../compras/WriteFeedback';
import { ItemFieldInput, ItemUdfInput, itemInputCls } from './ItemFieldInput';

interface Props {
  /** Si se entrega el detalle, el formulario edita ese artículo; si no, crea uno nuevo */
  item?: ItemDetail;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = ItemSection | 'udf';
const TABS: Tab[] = ['general', 'purchasing', 'sales', 'inventory', 'status', 'udf'];
const TAB_LABEL: Record<Tab, string> = { ...ITEM_SECTION_LABEL, udf: 'Campos de usuario' };

function initialFields(item?: ItemDetail): Record<string, ItemFieldValue> {
  const v: Record<string, ItemFieldValue> = {};
  for (const f of ITEM_FIELDS) v[f.key] = item ? (item.fields[f.key] ?? emptyFieldValue(f)) : emptyFieldValue(f);
  if (!item) {
    v.itemType = 'itItems';
    v.inventoryItem = true;
    v.salesItem = true;
    v.purchaseItem = true;
    v.manageStockByWarehouse = true;
  }
  return v;
}

/** Crear (POST) o editar (PATCH) un artículo del maestro. Solo envía lo que cambió al editar. */
export const ItemFormModal: React.FC<Props> = ({ item, onClose, onSaved }) => {
  const isEdit = Boolean(item);
  const cat = useSapQuery<ItemCatalogs>('/api/sap/item-catalogs');
  const catalogs = cat.data;

  const [tab, setTab] = useState<Tab>('general');
  const [code, setCode] = useState(item?.itemCode ?? '');
  const [fields, setFields] = useState<Record<string, ItemFieldValue>>(() => initialFields(item));
  const [udfs, setUdfs] = useState<Record<string, string | number>>(() => ({ ...(item?.udfs ?? {}) }));
  const [udfFilter, setUdfFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const original = initialFields(item);
  const setField = (k: string, v: ItemFieldValue) => setFields((f) => ({ ...f, [k]: v }));

  // Los campos de usuario con valor por defecto se precargan al crear
  const udfDefs = catalogs?.udfs ?? [];
  const udfValue = (name: string, dflt?: string): string | number => {
    if (name in udfs) return udfs[name];
    if (!isEdit && dflt) return dflt;
    return '';
  };

  const buildBody = (): { body: Record<string, unknown>; errors: string[] } => {
    const errors: string[] = [];
    const body: Record<string, unknown> = {};
    if (!isEdit) {
      body.itemCode = code.trim();
      if (!code.trim()) errors.push('El código del artículo es obligatorio');
    }
    for (const f of ITEM_FIELDS) {
      if (isEdit && f.createOnly) continue;
      const cur = fields[f.key];
      if (isEdit ? cur === original[f.key] : cur === '' && f.kind !== 'yesno') continue;
      if (isEdit && (cur === '' && (f.kind === 'number' || f.kind === 'int' || f.kind === 'enum'))) continue;
      if (f.required && cur === '') errors.push(`${f.label}: es obligatorio`);
      body[f.key] = cur;
    }
    if (!isEdit) {
      for (const f of ITEM_FIELDS) if (f.required && (fields[f.key] === '' || fields[f.key] === undefined)) {
        const msg = `${f.label}: es obligatorio`;
        if (!errors.includes(msg)) errors.push(msg);
      }
    }
    const udf: Record<string, string | number> = {};
    for (const d of udfDefs) {
      const cur = udfValue(d.name, d.defaultValue);
      const before = item?.udfs[d.name] ?? '';
      if (isEdit ? cur !== before : cur !== '') udf[d.name] = cur;
      if (d.mandatory && cur === '' && (!isEdit || cur !== before)) errors.push(`${d.label} (${d.name}): es obligatorio`);
    }
    if (Object.keys(udf).length > 0) body.udf = udf;
    if (isEdit && Object.keys(body).length === 0) errors.push('No hay cambios para enviar');
    return { body, errors };
  };

  const submit = async (dryRun: boolean) => {
    const { body, errors } = buildBody();
    setLocalErrors(errors);
    if (errors.length > 0) {
      setResult(null);
      return;
    }
    setBusy(true);
    setResult(null);
    const url = isEdit ? `/api/sap/items/${encodeURIComponent(item!.itemCode)}` : '/api/sap/items';
    const r = await sapWrite(url, isEdit ? 'PATCH' : 'POST', body, { dryRun });
    setResult(r);
    setBusy(false);
    if (r.ok && !r.dryRun) onSaved();
  };

  const visibleUdfs = udfDefs.filter((d) => {
    const q = udfFilter.trim().toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.label.toLowerCase().includes(q);
  });
  const mandatoryCount = udfDefs.filter((d) => d.mandatory).length;
  const done = result?.ok && !result.dryRun;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{isEdit ? `Editar artículo ${item!.itemCode}` : 'Nuevo artículo'}</h3>
            <p className="text-[11px] text-slate-500">
              {isEdit ? 'Solo se envían a SAP (PATCH) los campos que cambie.' : 'Se crea con POST /Items. Los campos con * son obligatorios.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pt-3 text-xs font-bold">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg border ${tab === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cat.isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" /> Cargando catálogos de SAP…
            </div>
          )}
          {cat.error && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">No se pudieron cargar los catálogos: {cat.error}</div>}

          {tab === 'udf' ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input value={udfFilter} onChange={(e) => setUdfFilter(e.target.value)} placeholder="Filtrar campos de usuario…" className={`${itemInputCls} max-w-xs`} />
                <span className="text-[11px] text-slate-500">
                  {udfDefs.length} campos · {mandatoryCount} obligatorios (*)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleUdfs.map((d) => (
                  <ItemUdfInput key={d.name} def={d} value={udfValue(d.name, d.defaultValue)} onChange={(v) => setUdfs((u) => ({ ...u, [d.name]: v }))} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tab === 'general' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Código del artículo <span className="text-rose-600">*</span>
                    {isEdit && <span className="ml-1 font-semibold text-slate-400">(no editable)</span>}
                  </label>
                  <input value={code} disabled={isEdit} maxLength={50} onChange={(e) => setCode(e.target.value)} className={`${itemInputCls} font-mono`} />
                </div>
              )}
              {ITEM_FIELDS.filter((f) => f.section === tab).map((f) => (
                <ItemFieldInput
                  key={f.key}
                  def={f}
                  value={fields[f.key]}
                  onChange={(v) => setField(f.key, v)}
                  catalogs={catalogs}
                  disabled={isEdit && f.createOnly}
                />
              ))}
            </div>
          )}

          {localErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <div className="font-bold mb-1">Revise antes de enviar:</div>
              <ul className="list-disc ml-4 space-y-0.5">
                {localErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <WriteFeedback result={result} />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 text-xs font-bold">
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700">
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={() => submit(true)}
            disabled={busy || Boolean(done)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" /> Simular
          </button>
          <button
            onClick={() => submit(false)}
            disabled={busy || Boolean(done)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isEdit ? 'Guardar cambios' : 'Crear artículo'}
          </button>
        </div>
      </div>
    </div>
  );
};
