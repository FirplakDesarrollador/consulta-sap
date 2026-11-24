'use client';

import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, Pencil, Lock, Unlock, Trash2 } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { money, qty, sapWrite, WriteResult } from '@/lib/comprasApi';
import { ITEM_FIELDS, ITEM_SECTION_LABEL, ItemFieldDef } from '@/lib/itemFields';
import { ItemCatalogs, ItemDetail, ItemFieldValue } from '@/types/items';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { ItemFormModal } from './ItemFormModal';
import { itemInputCls } from './ItemFieldInput';

interface Props {
  code: string;
  onClose: () => void;
  onChanged: () => void;
}

type Tab = 'general' | 'purchasing' | 'sales' | 'inventory' | 'warehouses' | 'prices' | 'udf';
const TAB_LABEL: Record<Tab, string> = {
  general: 'General',
  purchasing: 'Compras',
  sales: 'Ventas',
  inventory: 'Inventario',
  warehouses: 'Existencias por almacén',
  prices: 'Precios',
  udf: 'Campos de usuario'
};

type Pending = 'freeze' | 'unfreeze' | 'delete' | null;

function showValue(f: ItemFieldDef, v: ItemFieldValue | undefined, cat: ItemCatalogs | null): string {
  if (v === undefined || v === '') return '—';
  if (f.kind === 'yesno') return v === true ? 'Sí' : 'No';
  if (f.kind === 'enum') return f.options?.find((o) => o.value === v)?.label ?? String(v);
  if (f.lookup === 'itemGroups') return cat?.itemGroups.find((g) => g.code === Number(v))?.name ? `${v} · ${cat?.itemGroups.find((g) => g.code === Number(v))?.name}` : String(v);
  if (f.lookup === 'manufacturers') return Number(v) === -1 ? '(ninguno)' : (cat?.manufacturers.find((m) => m.code === Number(v))?.name ?? String(v));
  if (f.lookup === 'uomGroups') return Number(v) === -1 ? 'Manual (sin grupo)' : (cat?.uomGroups.find((u) => u.code === Number(v))?.name ?? String(v));
  return String(v);
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className="font-mono font-extrabold text-slate-900 text-sm">{value}</div>
  </div>
);

/** Detalle del artículo: pestañas, edición, inactivar/activar y eliminación con confirmación fuerte */
export const ItemDetailModal: React.FC<Props> = ({ code, onClose, onChanged }) => {
  const base = `/api/sap/items/${encodeURIComponent(code)}`;
  const [allPrices, setAllPrices] = useState(false);
  const q = useSapQuery<ItemDetail>(`${base}${allPrices ? '?allPrices=1' : ''}`);
  const cat = useSapQuery<ItemCatalogs>('/api/sap/item-catalogs');
  const item = q.data;
  const catalogs = cat.data;

  const [tab, setTab] = useState<Tab>('general');
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [typed, setTyped] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [whFilter, setWhFilter] = useState('');
  const [onlyStock, setOnlyStock] = useState(false);

  const run = async (dryRun: boolean) => {
    if (!pending) return;
    setBusy(true);
    let r: WriteResult;
    if (pending === 'delete') {
      r = await sapWrite(`${base}?confirm=${encodeURIComponent(code)}`, 'DELETE', undefined, { dryRun });
    } else {
      r = await sapWrite(`${base}/${pending}`, 'POST', pending === 'freeze' && remarks.trim() ? { remarks: remarks.trim() } : undefined, { dryRun });
    }
    setBusy(false);
    setResult(r);
    setPending(null);
    setTyped('');
    if (r.ok && !r.dryRun) {
      onChanged();
      if (pending === 'delete') onClose();
      else q.reload();
    }
  };

  const section = (s: 'general' | 'purchasing' | 'sales' | 'inventory') => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
      {ITEM_FIELDS.filter((f) => f.section === s || (s === 'general' && f.section === 'status')).map((f) => (
        <div key={f.key} className={`${f.kind === 'longtext' ? 'sm:col-span-2' : ''} border-b border-slate-100 pb-1.5`}>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
            {s === 'general' && f.section === 'status' ? `${ITEM_SECTION_LABEL.status} · ` : ''}
            {f.label}
          </div>
          <div className="text-xs text-slate-900 break-words whitespace-pre-wrap">{showValue(f, item?.fields[f.key], catalogs)}</div>
        </div>
      ))}
    </div>
  );

  const whs = (item?.warehouses ?? []).filter(
    (w) => (!whFilter || w.warehouseCode.toLowerCase().includes(whFilter.trim().toLowerCase())) && (!onlyStock || w.inStock !== 0 || w.committed !== 0 || w.ordered !== 0)
  );
  const plName = (n: number) => catalogs?.priceLists.find((p) => p.code === n)?.name ?? '';
  const udfDefs = catalogs?.udfs ?? [];
  const udfRows = Object.entries(item?.udfs ?? {}).filter(([, v]) => v !== '' && v !== 0);

  const pendingText: Record<Exclude<Pending, null>, { title: string; label: string; tone: 'danger' | 'warning' | 'primary'; text: string }> = {
    freeze: { title: 'Inactivar artículo', label: 'Inactivar', tone: 'warning', text: 'El artículo quedará inactivo (Frozen = Sí, Válido = No) y no se podrá usar en documentos nuevos. Se puede volver a activar.' },
    unfreeze: { title: 'Activar artículo', label: 'Activar', tone: 'primary', text: 'El artículo volverá a estar activo y disponible en documentos.' },
    delete: { title: 'Eliminar artículo', label: 'Eliminar definitivamente', tone: 'danger', text: 'Se elimina de SAP (DELETE). SAP lo rechaza si el artículo tiene movimientos, documentos o existencias; en ese caso use Inactivar. No se puede deshacer.' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 font-mono">{code}</h3>
              {item && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${item.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{item.status}</span>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate">{item?.itemName}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            {item && (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                {item.allowed.freeze && (
                  <button onClick={() => setPending('freeze')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100">
                    <Lock className="h-3.5 w-3.5" /> Inactivar
                  </button>
                )}
                {item.allowed.unfreeze && (
                  <button onClick={() => setPending('unfreeze')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100">
                    <Unlock className="h-3.5 w-3.5" /> Activar
                  </button>
                )}
                <button onClick={() => setPending('delete')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {q.isLoading && (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 mt-2">Consultando SAP Service Layer...</div>
          </div>
        )}
        {q.error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {q.error}
            </span>
            <button onClick={q.reload} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold">
              Reintentar
            </button>
          </div>
        )}

        {item && (
          <>
            <div className="px-4 pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Stat label="En stock" value={qty(item.totals.inStock)} />
              <Stat label="Comprometido" value={qty(item.totals.committed)} />
              <Stat label="Solicitado" value={qty(item.totals.ordered)} />
              <Stat label="Disponible" value={qty(item.totals.available)} />
              <Stat label="Costo promedio" value={money(item.avgPrice)} />
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pt-3 text-xs font-bold">
              {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg border ${tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <WriteFeedback result={result} />
              {tab === 'general' && (
                <>
                  {section('general')}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                    <div>Creado: <strong className="text-slate-800">{item.createDate || '—'}</strong></div>
                    <div>Actualizado: <strong className="text-slate-800">{item.updateDate || '—'}</strong></div>
                    <div>Proveedores preferidos: <strong className="text-slate-800">{item.vendors.length ? item.vendors.join(', ') : '—'}</strong></div>
                  </div>
                  {item.barcodes.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">Códigos de barras adicionales (solo lectura)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.barcodes.map((b) => (
                          <span key={`${b.barcode}-${b.uomEntry}`} className="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px]" title={b.freeText}>{b.barcode}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {tab === 'purchasing' && section('purchasing')}
              {tab === 'sales' && section('sales')}
              {tab === 'inventory' && section('inventory')}

              {tab === 'warehouses' && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <input value={whFilter} onChange={(e) => setWhFilter(e.target.value)} placeholder="Filtrar almacén…" className={`${itemInputCls} max-w-[200px]`} />
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} className="accent-emerald-600" /> Solo con movimiento
                    </label>
                    <span className="text-[11px] text-slate-500">{whs.length} de {item.warehouses.length} almacenes (solo lectura)</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-600">
                          <th className="p-2.5">Almacén</th>
                          <th className="p-2.5 text-right">En stock</th>
                          <th className="p-2.5 text-right">Comprometido</th>
                          <th className="p-2.5 text-right">Solicitado</th>
                          <th className="p-2.5 text-right">Disponible</th>
                          <th className="p-2.5 text-right">Mín.</th>
                          <th className="p-2.5 text-right">Máx.</th>
                          <th className="p-2.5 text-right">Costo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {whs.map((w) => (
                          <tr key={w.warehouseCode} className={w.locked ? 'text-slate-400' : ''}>
                            <td className="p-2.5 font-mono font-bold">{w.warehouseCode}{w.locked && ' 🔒'}</td>
                            <td className="p-2.5 text-right font-mono">{qty(w.inStock)}</td>
                            <td className="p-2.5 text-right font-mono">{qty(w.committed)}</td>
                            <td className="p-2.5 text-right font-mono">{qty(w.ordered)}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{qty(w.available)}</td>
                            <td className="p-2.5 text-right font-mono">{qty(w.minStock)}</td>
                            <td className="p-2.5 text-right font-mono">{qty(w.maxStock)}</td>
                            <td className="p-2.5 text-right font-mono">{money(w.avgPrice)}</td>
                          </tr>
                        ))}
                        {whs.length === 0 && (
                          <tr><td colSpan={8} className="p-6 text-center text-slate-500">Sin almacenes para mostrar.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {tab === 'prices' && (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-[11px] text-slate-500">
                      {item.prices.length} de {item.pricesTotal} listas (solo lectura; los precios se gestionan en el módulo de Listas de precios)
                    </span>
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <input type="checkbox" checked={allPrices} onChange={(e) => setAllPrices(e.target.checked)} className="accent-emerald-600" /> Incluir listas con precio 0
                    </label>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-600">
                          <th className="p-2.5">Lista</th>
                          <th className="p-2.5">Nombre</th>
                          <th className="p-2.5 text-right">Precio</th>
                          <th className="p-2.5">Moneda</th>
                          <th className="p-2.5">Lista base</th>
                          <th className="p-2.5 text-right">Factor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {item.prices.map((p) => (
                          <tr key={p.priceList}>
                            <td className="p-2.5 font-mono font-bold">{p.priceList}</td>
                            <td className="p-2.5">{plName(p.priceList) || '—'}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{money(p.price)}</td>
                            <td className="p-2.5">{p.currency || '—'}</td>
                            <td className="p-2.5 font-mono">{p.basePriceList}</td>
                            <td className="p-2.5 text-right font-mono">{p.factor}</td>
                          </tr>
                        ))}
                        {item.prices.length === 0 && (
                          <tr><td colSpan={6} className="p-6 text-center text-slate-500">El artículo no tiene precios definidos.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {tab === 'udf' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {udfRows.length === 0 && <div className="text-xs text-slate-500">El artículo no tiene campos de usuario con valor.</div>}
                  {udfRows.map(([k, v]) => {
                    const def = udfDefs.find((d) => d.name === k);
                    const vv = def?.validValues?.find((x) => x.value === String(v))?.label ?? String(v);
                    return (
                      <div key={k} className="border-b border-slate-100 pb-1.5">
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                          {def?.label ?? k} <span className="font-mono normal-case font-normal text-slate-400">{k}</span>
                        </div>
                        <div className="text-xs text-slate-900 break-words">{vv}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          open
          title={pendingText[pending].title}
          tone={pendingText[pending].tone}
          confirmLabel={busy ? 'Enviando…' : pendingText[pending].label}
          isBusy={busy || (pending === 'delete' && typed !== code)}
          message={
            <div className="space-y-2">
              <p>{pendingText[pending].text}</p>
              {pending === 'freeze' && (
                <input value={remarks} maxLength={30} onChange={(e) => setRemarks(e.target.value)} placeholder="Motivo (opcional, máx. 30)" className={itemInputCls} />
              )}
              {pending === 'delete' && (
                <>
                  <p className="font-bold text-rose-700">Para confirmar escriba el código exacto: <span className="font-mono">{code}</span></p>
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} className={`${itemInputCls} font-mono`} />
                </>
              )}
              <button
                type="button"
                disabled={busy || (pending === 'delete' && typed !== code)}
                onClick={() => run(true)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 disabled:opacity-50"
              >
                Simular (no envía nada a SAP)
              </button>
            </div>
          }
          onConfirm={() => run(false)}
          onCancel={() => {
            setPending(null);
            setTyped('');
          }}
        />
      )}

      {editing && item && (
        <ItemFormModal
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            onChanged();
            q.reload();
          }}
        />
      )}
    </div>
  );
};
