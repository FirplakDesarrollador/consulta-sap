'use client';

import React, { useState } from 'react';
import { useSapQuery } from '@/lib/useSapQuery';
import { X, Calculator, RefreshCw, AlertCircle, Pencil, Ban, Lock, FlaskConical, Save, FileCode2, Package, Coins } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { money, qty, sapWrite, WriteResult } from '@/lib/comprasApi';
import { LandedCostRow } from '@/types/sapBusiness';

interface LandedCostDetail extends LandedCostRow {
  broker: string;
  billOfLadingNumber: string;
  beforeTax: number;
  itemLines: {
    lineNumber: number;
    baseEntry: number | null;
    baseLine: number | null;
    reference: string;
    itemCode: string;
    description: string;
    quantity: number;
    baseDocumentPrice: number;
    warehouse: string;
    totalCosts: number;
    warehousePrice: number;
    lineTotal: number;
  }[];
  costLines: { landedCostCode: string; amount: number; allocationBy: string; costType: string; factor: number }[];
  allowed: { update: boolean; cancel: boolean; close: boolean; delete: boolean };
  raw: unknown;
}

interface Props {
  docEntry: number;
  onClose: () => void;
  onChanged: () => void;
}

const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600';

type Action = 'update' | 'cancel' | 'close';

export const LandedCostDetailModal: React.FC<Props> = ({ docEntry, onClose, onChanged }) => {
  const [tab, setTab] = useState<'items' | 'costs' | 'raw'>('items');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ remarks: '', reference: '', fileNumber: '', billOfLadingNumber: '', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [result, setResult] = useState<WriteResult | null>(null);

  const baseUrl = `/api/sap/landed-costs/${docEntry}`;

  const { data: detail, isLoading, error, reload: load } = useSapQuery<LandedCostDetail>(baseUrl);

  const startEdit = () => {
    if (!detail) return;
    setForm({
      remarks: detail.remarks,
      reference: detail.reference,
      fileNumber: detail.fileNumber,
      billOfLadingNumber: detail.billOfLadingNumber,
      dueDate: detail.dueDate
    });
    setResult(null);
    setEditing(true);
  };

  const patchBody = () => {
    if (!detail) return {};
    const orig: Record<string, string> = {
      remarks: detail.remarks,
      reference: detail.reference,
      fileNumber: detail.fileNumber,
      billOfLadingNumber: detail.billOfLadingNumber,
      dueDate: detail.dueDate
    };
    const body: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
      if (form[k] !== orig[k] && !(k === 'dueDate' && !form[k])) body[k] = form[k];
    });
    return body;
  };

  const run = async (action: Action, dryRun = false) => {
    setBusy(true);
    let r: WriteResult;
    if (action === 'update') {
      const body = patchBody();
      r = Object.keys(body).length === 0 ? { ok: false, message: 'No hay cambios para guardar' } : await sapWrite(baseUrl, 'PATCH', body, { dryRun });
    } else {
      r = await sapWrite(`${baseUrl}/${action}`, 'POST', undefined, { dryRun });
    }
    setBusy(false);
    setPending(null);
    setResult(r);
    if (r.ok && !r.dryRun) {
      setEditing(false);
      onChanged();
      load();
    }
  };

  const confirmText: Record<Action, { title: string; message: string; label: string; tone: 'danger' | 'warning' | 'primary' }> = {
    update: { title: '¿Guardar cambios en SAP?', message: 'Se enviará un PATCH solo con los campos modificados.', label: 'Sí, guardar', tone: 'primary' },
    cancel: {
      title: 'Cancelar precio de entrega',
      message: 'SAP ejecutará CancelLandedCost: revierte los costos asignados al inventario. No se puede deshacer.',
      label: 'Sí, cancelar en SAP',
      tone: 'danger'
    },
    close: {
      title: 'Cerrar precio de entrega',
      message: 'SAP ejecutará CloseLandedCost. Un precio de entrega cerrado no se puede reabrir.',
      label: 'Sí, cerrar en SAP',
      tone: 'warning'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 text-white rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-xl font-extrabold text-slate-900">Precio de Entrega #{detail?.docNum || docEntry}</h3>
                {detail && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      detail.status === 'Cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {detail.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {detail?.vendorName || 'Sin proveedor (agente)'} {detail?.vendorCode && `• ${detail.vendorCode}`}
                {detail?.fileNumber && ` • Expediente: ${detail.fileNumber}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 border border-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {detail && !editing && (
          <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex flex-wrap gap-2 text-xs font-bold">
            {detail.allowed.update && (
              <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            {detail.allowed.close && (
              <button onClick={() => setPending('close')} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Cerrar
              </button>
            )}
            {detail.allowed.cancel && (
              <button onClick={() => setPending('cancel')} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}
            {!detail.allowed.update && <span className="text-slate-500 font-medium py-1.5">Documento cerrado: sin acciones disponibles en SAP.</span>}
          </div>
        )}

        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold">
          {([
            ['items', Package, `Artículos (${detail?.itemLines.length || 0})`],
            ['costs', Coins, `Costos (${detail?.costLines.length || 0})`],
            ['raw', FileCode2, 'JSON Service Layer']
          ] as const).map(([t, Icon, text]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 border-b-2 flex items-center gap-2 ${tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="h-4 w-4" />
              {text}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          <WriteFeedback result={result} />
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
              <div className="text-sm font-bold text-slate-800">Consultando precio de entrega en SAP...</div>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
              <AlertCircle className="h-6 w-6 text-rose-600" />
              <div className="break-all">{error}</div>
            </div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Contabilización</span>
                  <div className="font-mono font-bold mt-1">{detail.postingDate}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Vencimiento</span>
                  <div className="font-mono font-bold mt-1">{detail.dueDate || '—'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Referencia / B/L</span>
                  <div className="font-mono font-bold mt-1">{detail.reference || '—'} / {detail.billOfLadingNumber || '—'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200">
                  <span className="text-[11px] font-bold text-violet-700 uppercase">Total costos</span>
                  <div className="text-lg font-mono font-extrabold text-violet-900 mt-1">{detail.currency} {money(detail.total)}</div>
                </div>
              </div>

              {editing && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Referencia</label>
                    <input value={form.reference} maxLength={100} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">N° expediente</label>
                    <input value={form.fileNumber} maxLength={50} onChange={(e) => setForm({ ...form, fileNumber: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">N° conocimiento embarque</label>
                    <input value={form.billOfLadingNumber} maxLength={50} onChange={(e) => setForm({ ...form, billOfLadingNumber: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Vencimiento</label>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Comentarios</label>
                    <textarea rows={2} maxLength={254} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={inputCls} />
                  </div>
                </div>
              )}

              {tab === 'items' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Artículo</th>
                        <th className="py-3 px-3">Descripción</th>
                        <th className="py-3 px-3">Entrada base</th>
                        <th className="py-3 px-3 text-right">Cantidad</th>
                        <th className="py-3 px-3 text-right">Precio base</th>
                        <th className="py-3 px-3 text-right">Costos asignados</th>
                        <th className="py-3 px-3 text-right">Precio almacén</th>
                        <th className="py-3 px-3 text-center">Almacén</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.itemLines.map((l) => (
                        <tr key={l.lineNumber}>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{l.lineNumber}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-violet-700">{l.itemCode}</td>
                          <td className="py-2.5 px-3">{l.description}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {l.reference || (l.baseEntry !== null ? `DocEntry ${l.baseEntry}` : '—')}
                            {l.baseLine !== null && ` / L${l.baseLine}`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{qty(l.quantity)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{money(l.baseDocumentPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{money(l.totalCosts)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{money(l.warehousePrice)}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{l.warehouse || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'costs' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                        <th className="py-3 px-3">Código gasto</th>
                        <th className="py-3 px-3">Distribución</th>
                        <th className="py-3 px-3">Tipo</th>
                        <th className="py-3 px-3 text-right">Factor</th>
                        <th className="py-3 px-3 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.costLines.map((c, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-mono font-bold">{c.landedCostCode}</td>
                          <td className="py-2.5 px-3">{c.allocationBy}</td>
                          <td className="py-2.5 px-3">{c.costType}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.factor}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{money(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'raw' && (
                <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
                  <pre>{JSON.stringify(detail.raw, null, 2)}</pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">Service Layer v1 • LandedCosts (OIPF)</span>
          {editing ? (
            <div className="flex gap-2 font-bold">
              <button onClick={() => setEditing(false)} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-300 bg-white">
                Descartar
              </button>
              <button onClick={() => run('update', true)} disabled={busy} className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" /> Simular
              </button>
              <button onClick={() => setPending('update')} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-1.5">
                <Save className="h-4 w-4" /> Guardar en SAP
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold">
              Cerrar detalle
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? confirmText[pending].title : ''}
        message={pending ? `${confirmText[pending].message} Documento ${detail?.docNum || docEntry}.` : ''}
        confirmLabel={pending ? confirmText[pending].label : undefined}
        tone={pending ? confirmText[pending].tone : undefined}
        isBusy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && run(pending)}
      />
    </div>
  );
};
