'use client';

import React, { useState } from 'react';
import { Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Pencil, X, FlaskConical, Save } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { InvNumberRow, InvNumberType } from '@/types/inventory';
import { sapWrite, WriteResult } from '@/lib/comprasApi';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { inputCls } from './inventoryMeta';

const FIELDS: Record<InvNumberType, { key: string; label: string; type: 'text' | 'date' | 'status'; max?: number }[]> = {
  serials: [
    { key: 'mfrSerialNo', label: 'Serie del fabricante', type: 'text', max: 36 },
    { key: 'lotNumber', label: 'Número de lote', type: 'text', max: 36 },
    { key: 'location', label: 'Ubicación', type: 'text', max: 100 },
    { key: 'manufacturingDate', label: 'Fecha de fabricación', type: 'date' },
    { key: 'expirationDate', label: 'Fecha de vencimiento', type: 'date' },
    { key: 'details', label: 'Detalles', type: 'text', max: 254 }
  ],
  batches: [
    { key: 'status', label: 'Estado', type: 'status' },
    { key: 'attribute1', label: 'Atributo 1', type: 'text', max: 36 },
    { key: 'attribute2', label: 'Atributo 2', type: 'text', max: 36 },
    { key: 'manufacturingDate', label: 'Fecha de fabricación', type: 'date' },
    { key: 'expirationDate', label: 'Fecha de vencimiento', type: 'date' },
    { key: 'details', label: 'Detalles', type: 'text', max: 254 }
  ]
};

const STATUS_VALUES: Record<string, string> = {
  Liberado: 'bdsStatus_Released',
  'No accesible': 'bdsStatus_NotAccessible',
  Bloqueado: 'bdsStatus_Locked'
};

const rowValue = (r: InvNumberRow, key: string): string => {
  if (key === 'status') return STATUS_VALUES[r.status] || r.status;
  return String((r as unknown as Record<string, unknown>)[key] ?? '');
};

/** Series (OSRN) / Lotes (OBTN): consulta y actualización de atributos (el SL no permite crear ni borrar) */
export const InventoryNumbersPanel: React.FC<{ type: InvNumberType; refreshKey?: number }> = ({ type, refreshKey = 0 }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [temp, setTemp] = useState('');
  const [editing, setEditing] = useState<InvNumberRow | null>(null);
  const q = useSapQuery<InvNumberRow[]>(`/api/sap/inventory/numbers/${type}?page=${page}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`, [refreshKey]);
  const rows = Array.isArray(q.data) ? q.data : [];
  const isSerial = type === 'serials';

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(temp.trim());
          setPage(1);
        }}
        className="flex flex-wrap items-end gap-2 bg-white border border-slate-200/90 rounded-2xl p-4"
      >
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar (artículo, descripción o {isSerial ? 'serie' : 'lote'})</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={temp} onChange={(e) => setTemp(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50" placeholder="Ej: PMOL02, 0177-24" />
          </div>
        </div>
        <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
          Buscar
        </button>
        {q.isLoading && <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mb-1.5" />}
      </form>

      {q.error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {q.error}
        </div>
      )}

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4 text-left">{isSerial ? 'Serie' : 'Lote'}</th>
                <th className="py-3 px-4 text-left">Artículo</th>
                <th className="py-3 px-4 text-left">Descripción</th>
                <th className="py-3 px-4 text-left">{isSerial ? 'Serie fabricante' : 'Estado'}</th>
                <th className="py-3 px-4 text-left">{isSerial ? 'Ubicación' : 'Atributo 1'}</th>
                <th className="py-3 px-4 text-left">Admisión</th>
                <th className="py-3 px-4 text-left">Vencimiento</th>
                {isSerial && <th className="py-3 px-4 text-left">Estado molde</th>}
                <th className="py-3 px-4 text-center">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!q.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No hay {isSerial ? 'números de serie' : 'lotes'} registrados{search ? ' con ese criterio' : ' en SAP'}.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.docEntry} className="hover:bg-emerald-50/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{r.number}</td>
                  <td className="py-2.5 px-4 font-mono">{r.itemCode}</td>
                  <td className="py-2.5 px-4 max-w-[280px] truncate" title={r.itemDescription}>
                    {r.itemDescription}
                  </td>
                  <td className="py-2.5 px-4">{(isSerial ? r.mfrSerialNo : r.status) || '—'}</td>
                  <td className="py-2.5 px-4">{(isSerial ? r.location : r.attribute1) || '—'}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">{r.admissionDate || '—'}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">{r.expirationDate || '—'}</td>
                  {isSerial && <td className="py-2.5 px-4">{r.estadoMolde || '—'}</td>}
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white" title="Editar atributos">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button onClick={() => setPage(page - 1)} disabled={page === 1 || q.isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span className="px-3 py-1 bg-slate-200/80 rounded-lg font-mono font-bold">Pág. {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={!q.json?.hasMore || q.isLoading} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 flex items-center gap-1 font-semibold text-emerald-700">
            Siguiente <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing && <NumberEditModal key={editing.docEntry} type={type} row={editing} onClose={() => setEditing(null)} onSaved={q.reload} />}
    </div>
  );
};

const NumberEditModal: React.FC<{ type: InvNumberType; row: InvNumberRow; onClose: () => void; onSaved: () => void }> = ({ type, row, onClose, onSaved }) => {
  const fields = FIELDS[type];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, rowValue(row, f.key)])));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);

  const diff = () => Object.fromEntries(fields.filter((f) => values[f.key] !== rowValue(row, f.key)).map((f) => [f.key, values[f.key]]));

  const save = async (dryRun: boolean) => {
    setConfirm(false);
    setBusy(true);
    const r = await sapWrite(`/api/sap/inventory/numbers/${type}/${row.docEntry}`, 'PATCH', diff(), { dryRun });
    setResult(r);
    setBusy(false);
    if (r.ok && !r.dryRun) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {type === 'serials' ? 'Número de serie' : 'Lote'} {row.number}
            </h3>
            <p className="text-[11px] text-slate-500">
              {row.itemCode} — {row.itemDescription}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.key === 'details' ? 'md:col-span-2' : ''}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">{f.label}</label>
              {f.type === 'status' ? (
                <select className={inputCls} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                  {Object.entries(STATUS_VALUES).map(([l, v]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  maxLength={f.max}
                  className={inputCls}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="md:col-span-2">
            <WriteFeedback result={result} />
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700">
            Cerrar
          </button>
          <button onClick={() => save(true)} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-bold">
            <FlaskConical className="h-4 w-4" /> Simular
          </button>
          <button onClick={() => setConfirm(true)} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
            <Save className="h-4 w-4" /> Guardar en SAP
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Actualizar atributos"
        message="Se enviarán los cambios (PATCH) a SAP Business One."
        confirmLabel="Guardar"
        tone="primary"
        isBusy={busy}
        onConfirm={() => save(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
};
