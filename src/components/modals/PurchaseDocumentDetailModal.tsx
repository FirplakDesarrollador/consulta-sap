'use client';

import React, { useState } from 'react';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { useSapQuery } from '@/lib/useSapQuery';
import {
  X,
  ShoppingCart,
  Package,
  Building2,
  FileCode2,
  RefreshCw,
  AlertCircle,
  Pencil,
  Ban,
  Lock,
  Unlock,
  Trash2,
  FileCheck2,
  Plus,
  FlaskConical,
  Save
} from 'lucide-react';
import { PurchaseDocDetail, PurchaseDocKind } from '@/types/sapBusiness';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SapLookupInput } from '../common/SapLookupInput';
import { WriteFeedback } from '../compras/WriteFeedback';
import { money, qty, sapWrite, WriteResult } from '@/lib/comprasApi';

interface Props {
  kind: PurchaseDocKind;
  label: string;
  docId: string; // OC-123 | EM-123 | DRF-123
  onClose: () => void;
  onChanged: () => void;
}

type Action = 'cancel' | 'close' | 'reopen' | 'delete' | 'save-draft-to-document' | 'update';

interface EditLine {
  key: string;
  lineNum?: number;
  itemCode: string;
  description: string;
  quantity: number | '';
  price: number | '';
  warehouseCode: string;
  original?: { quantity: number; price: number; warehouseCode: string };
}

const statusBadge = (s: string) =>
  s === 'Cerrado'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : s === 'Cancelado'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200';

const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600';

const EDITABLE_HEADER: Record<PurchaseDocKind, string[]> = {
  'purchase-orders': ['comments', 'numAtCard', 'docDueDate', 'taxDate'],
  'goods-receipts': ['comments', 'numAtCard']
};

const ACTION_TEXT: Record<Exclude<Action, 'update'>, { title: string; body: string; confirm: string; tone: 'danger' | 'warning' | 'primary' }> = {
  cancel: {
    title: 'Cancelar documento en SAP',
    body: 'SAP marcará el documento como cancelado (en entradas de mercancía genera el documento de cancelación que revierte inventario). Esta acción no se puede deshacer.',
    confirm: 'Sí, cancelar en SAP',
    tone: 'danger'
  },
  close: {
    title: 'Cerrar documento en SAP',
    body: 'Las cantidades pendientes dejarán de estar abiertas. En órdenes de compra se puede reabrir después.',
    confirm: 'Sí, cerrar en SAP',
    tone: 'warning'
  },
  reopen: {
    title: 'Reabrir orden de compra',
    body: 'La orden volverá a estado abierto en SAP.',
    confirm: 'Sí, reabrir',
    tone: 'primary'
  },
  delete: {
    title: 'Eliminar borrador',
    body: 'El borrador se eliminará definitivamente de SAP (DELETE /Drafts). Los documentos definitivos no se pueden eliminar.',
    confirm: 'Sí, eliminar borrador',
    tone: 'danger'
  },
  'save-draft-to-document': {
    title: 'Convertir borrador en documento',
    body: 'SAP creará el documento definitivo a partir de este borrador (DraftsService_SaveDraftToDocument).',
    confirm: 'Sí, crear documento',
    tone: 'primary'
  }
};

let seq = 0;

export const PurchaseDocumentDetailModal: React.FC<Props> = ({ kind, label, docId, onClose, onChanged }) => {
  const isDraft = /^DRF-/.test(docId);
  const [tab, setTab] = useState<'lines' | 'header' | 'raw'>('lines');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [result, setResult] = useState<WriteResult | null>(null);

  // Estado de edición
  const [form, setForm] = useState({ comments: '', numAtCard: '', docDueDate: '', taxDate: '', docDate: '' });
  const [editLines, setEditLines] = useState<EditLine[]>([]);

  const baseUrl = `/api/sap/purchasing/${kind}/${encodeURIComponent(docId)}`;

  const { data: detail, isLoading, error, reload: load } = useSapQuery<PurchaseDocDetail>(baseUrl);

  const startEdit = () => {
    if (!detail) return;
    setForm({
      comments: detail.comments,
      numAtCard: detail.numAtCard,
      docDueDate: detail.docDueDate,
      taxDate: detail.taxDate,
      docDate: detail.docDate
    });
    setEditLines(
      detail.lines
        .filter((l) => l.lineStatus === 'Abierta')
        .map((l) => ({
          key: `e${++seq}`,
          lineNum: l.lineNum,
          itemCode: l.itemCode,
          description: l.description,
          quantity: l.quantity,
          price: l.price,
          warehouseCode: l.whsCode,
          original: { quantity: l.quantity, price: l.price, warehouseCode: l.whsCode }
        }))
    );
    setResult(null);
    setEditing(true);
    setTab('lines');
  };

  const editableHeader = isDraft ? [...EDITABLE_HEADER['purchase-orders'], 'docDate'] : EDITABLE_HEADER[kind];

  const buildPatch = () => {
    if (!detail) return {};
    const body: Record<string, unknown> = {};
    const orig: Record<string, string> = {
      comments: detail.comments,
      numAtCard: detail.numAtCard,
      docDueDate: detail.docDueDate,
      taxDate: detail.taxDate,
      docDate: detail.docDate
    };
    for (const k of editableHeader) {
      const v = form[k as keyof typeof form];
      if (v !== orig[k] && !(k.endsWith('Date') && !v)) body[k] = v;
    }
    if (detail.allowed.updateLines) {
      const changed = editLines
        .filter((l) => {
          if (l.lineNum === undefined) return l.itemCode.trim() !== '';
          const o = l.original!;
          return Number(l.quantity) !== o.quantity || Number(l.price) !== o.price || l.warehouseCode !== o.warehouseCode;
        })
        .map((l) => {
          const out: Record<string, unknown> = {};
          if (l.lineNum !== undefined) {
            out.lineNum = l.lineNum;
            const o = l.original!;
            if (Number(l.quantity) !== o.quantity) out.quantity = Number(l.quantity);
            if (Number(l.price) !== o.price) out.price = Number(l.price);
            if (l.warehouseCode !== o.warehouseCode && l.warehouseCode) out.warehouseCode = l.warehouseCode;
          } else {
            out.itemCode = l.itemCode.trim();
            out.quantity = Number(l.quantity);
            if (l.price !== '') out.price = Number(l.price);
            if (l.warehouseCode) out.warehouseCode = l.warehouseCode;
          }
          return out;
        });
      if (changed.length) body.lines = changed;
    }
    return body;
  };

  const run = async (action: Action, dryRun = false) => {
    setBusy(true);
    let r: WriteResult;
    if (action === 'update') {
      const body = buildPatch();
      if (Object.keys(body).length === 0) {
        r = { ok: false, message: 'No hay cambios para guardar' };
      } else {
        r = await sapWrite(baseUrl, 'PATCH', body, { dryRun });
      }
    } else if (action === 'delete') {
      r = await sapWrite(baseUrl, 'DELETE', undefined, { dryRun });
    } else {
      r = await sapWrite(`${baseUrl}/${action}`, 'POST', undefined, { dryRun });
    }
    setBusy(false);
    setPending(null);
    setResult(r);
    if (r.ok && !r.dryRun) {
      onChanged();
      if (action === 'delete' || action === 'save-draft-to-document') {
        onClose();
        return;
      }
      setEditing(false);
      load();
    }
  };

  const a = detail?.allowed;
  const pendingText = pending && pending !== 'update' ? ACTION_TEXT[pending] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-xl font-extrabold text-slate-900">
                  {isDraft ? 'Borrador ' : ''}
                  {label} #{detail?.docNum || docId.replace(/^[A-Z]+-/, '')}
                </h3>
                {detail && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(detail.status)}`}>{detail.status}</span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono">
                  DocEntry: {detail?.docEntry || '...'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {detail?.cardName || 'Consultando proveedor...'} {detail?.cardCode && `• ${detail.cardCode}`}
                {detail?.numAtCard && ` • Ref. proveedor: ${detail.numAtCard}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 border border-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar */}
        {detail && !editing && (
          <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex flex-wrap gap-2 text-xs font-bold">
            {a?.update && (
              <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            {a?.saveDraftToDocument && (
              <button onClick={() => setPending('save-draft-to-document')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" /> Crear documento desde borrador
              </button>
            )}
            {a?.close && (
              <button onClick={() => setPending('close')} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Cerrar
              </button>
            )}
            {a?.reopen && (
              <button onClick={() => setPending('reopen')} className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 flex items-center gap-1.5">
                <Unlock className="h-3.5 w-3.5" /> Reabrir
              </button>
            )}
            {a?.cancel && (
              <button onClick={() => setPending('cancel')} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5" /> Cancelar documento
              </button>
            )}
            {a?.delete && (
              <button onClick={() => setPending('delete')} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar borrador
              </button>
            )}
            {!a?.update && !a?.reopen && (
              <span className="text-slate-500 font-medium py-1.5">Documento {detail.status.toLowerCase()}: sin acciones disponibles en SAP.</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold">
          {([
            ['lines', Package, `Líneas (${detail?.lines.length || 0})`],
            ['header', Building2, 'Cabecera & Proveedor'],
            ['raw', FileCode2, 'JSON Service Layer']
          ] as const).map(([t, Icon, text]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 border-b-2 flex items-center gap-2 ${tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
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
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
              <div className="text-sm font-bold text-slate-800">Consultando documento en SAP Business One...</div>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
              <AlertCircle className="h-6 w-6 text-rose-600" />
              <div className="break-all">{error}</div>
            </div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Subtotal</span>
                  <div className="text-lg font-mono font-extrabold text-slate-900 mt-1">{detail.currency} {money(detail.subtotal)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Impuestos</span>
                  <div className="text-lg font-mono font-extrabold text-slate-800 mt-1">{detail.currency} {money(detail.vatSum)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-700 uppercase">Pendiente</span>
                  <div className="text-lg font-mono font-extrabold text-amber-800 mt-1">
                    {qty(detail.totalOpenQuantity)} / {qty(detail.totalQuantity)}
                  </div>
                  <div className="text-[10.5px] text-amber-700 font-semibold">
                    {detail.openLinesCount} de {detail.lines.length} líneas abiertas
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Total</span>
                  <div className="text-lg font-mono font-extrabold text-emerald-900 mt-1">{detail.currency} {money(detail.docTotal)}</div>
                </div>
              </div>

              {editing && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-800">Editar campos permitidos por SAP</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {editableHeader.includes('numAtCard') && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Ref. proveedor</label>
                        <input value={form.numAtCard} maxLength={100} onChange={(e) => setForm({ ...form, numAtCard: e.target.value })} className={inputCls} />
                      </div>
                    )}
                    {editableHeader.includes('docDate') && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha documento</label>
                        <input type="date" value={form.docDate} onChange={(e) => setForm({ ...form, docDate: e.target.value })} className={inputCls} />
                      </div>
                    )}
                    {editableHeader.includes('docDueDate') && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha entrega</label>
                        <input type="date" value={form.docDueDate} onChange={(e) => setForm({ ...form, docDueDate: e.target.value })} className={inputCls} />
                      </div>
                    )}
                    {editableHeader.includes('taxDate') && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha contabilización</label>
                        <input type="date" value={form.taxDate} onChange={(e) => setForm({ ...form, taxDate: e.target.value })} className={inputCls} />
                      </div>
                    )}
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Comentarios</label>
                      <textarea value={form.comments} maxLength={254} rows={2} onChange={(e) => setForm({ ...form, comments: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  {!detail.allowed.updateLines && (
                    <p className="text-[11px] text-slate-600">Las líneas de una {label.toLowerCase()} contabilizada no se pueden modificar en SAP.</p>
                  )}
                </div>
              )}

              {tab === 'lines' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {editing && detail.allowed.updateLines ? (
                    <div className="overflow-x-auto">
                      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Líneas abiertas editables</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditLines((p) => [...p, { key: `e${++seq}`, itemCode: '', description: '', quantity: 1, price: '', warehouseCode: '' }])
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Agregar línea
                        </button>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                            <th className="py-2 px-2 text-left">Línea</th>
                            <th className="py-2 px-2 text-left min-w-[220px]">Artículo</th>
                            <th className="py-2 px-2 text-right w-28">Cantidad</th>
                            <th className="py-2 px-2 text-right w-32">Precio</th>
                            <th className="py-2 px-2 text-left w-36">Almacén</th>
                            <th className="py-2 px-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {editLines.map((l) => (
                            <tr key={l.key}>
                              <td className="py-2 px-2 font-mono text-slate-500">{l.lineNum ?? 'Nueva'}</td>
                              <td className="py-2 px-2">
                                {l.lineNum !== undefined ? (
                                  <div className="font-mono font-bold text-blue-700">
                                    {l.itemCode}
                                    <div className="text-[10px] font-normal text-slate-500">{l.description}</div>
                                  </div>
                                ) : (
                                  <SapLookupInput
                                    type="items"
                                    value={l.itemCode}
                                    placeholder="Código o descripción..."
                                    onChange={(code) => setEditLines((p) => p.map((x) => (x.key === l.key ? { ...x, itemCode: code } : x)))}
                                  />
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={l.quantity}
                                  onChange={(e) =>
                                    setEditLines((p) => p.map((x) => (x.key === l.key ? { ...x, quantity: e.target.value === '' ? '' : Number(e.target.value) } : x)))
                                  }
                                  className={`${inputCls} text-right font-mono`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={l.price}
                                  onChange={(e) =>
                                    setEditLines((p) => p.map((x) => (x.key === l.key ? { ...x, price: e.target.value === '' ? '' : Number(e.target.value) } : x)))
                                  }
                                  className={`${inputCls} text-right font-mono`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <SapLookupInput
                                  type="warehouses"
                                  value={l.warehouseCode}
                                  onChange={(code) => setEditLines((p) => p.map((x) => (x.key === l.key ? { ...x, warehouseCode: code } : x)))}
                                />
                              </td>
                              <td className="py-2 px-2">
                                {l.lineNum === undefined && (
                                  <button onClick={() => setEditLines((p) => p.filter((x) => x.key !== l.key))} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                            <th className="py-3 px-3 text-center">#</th>
                            <th className="py-3 px-3">Artículo</th>
                            <th className="py-3 px-3">Descripción</th>
                            <th className="py-3 px-3 text-right">Cantidad</th>
                            <th className="py-3 px-3 text-right">Pendiente</th>
                            <th className="py-3 px-3 text-right">Precio</th>
                            <th className="py-3 px-3 text-right">Total línea</th>
                            <th className="py-3 px-3 text-center">Almacén</th>
                            <th className="py-3 px-3 text-center">Impuesto</th>
                            <th className="py-3 px-3 text-center">Base</th>
                            <th className="py-3 px-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.lines.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-8 text-center text-slate-500">Sin líneas.</td>
                            </tr>
                          ) : (
                            detail.lines.map((l) => (
                              <tr key={l.lineNum} className="hover:bg-emerald-50/30">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">{l.lineNum}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">{l.itemCode || '—'}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{l.description}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{qty(l.quantity)} <span className="text-[10px] text-slate-500">{l.unitMsr}</span></td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${l.openQuantity > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{qty(l.openQuantity)}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{money(l.price)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-extrabold">{money(l.lineTotal)}</td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px]">{l.whsCode || '—'}</td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px]">{l.taxCode || '—'}</td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                                  {l.baseEntry !== null ? `${l.baseType === 22 ? 'OC' : l.baseType} ${l.baseEntry}/${l.baseLine}` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.lineStatus === 'Cerrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {l.lineStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'header' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <h4 className="font-bold uppercase text-emerald-700">Proveedor (OCRD)</h4>
                    <div><span className="text-slate-500">Nombre: </span><strong>{detail.cardName}</strong></div>
                    <div><span className="text-slate-500">CardCode: </span><span className="font-mono">{detail.cardCode}</span></div>
                    <div><span className="text-slate-500">NIT: </span><span className="font-mono">{detail.taxId}</span></div>
                    <div><span className="text-slate-500">Ref. proveedor: </span><span className="font-mono">{detail.numAtCard || '—'}</span></div>
                    <div><span className="text-slate-500">Dirección: </span>{detail.address}</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <h4 className="font-bold uppercase text-emerald-700">Fechas y gestión</h4>
                    <div><span className="text-slate-500">Fecha documento: </span><span className="font-mono">{detail.docDate}</span></div>
                    <div><span className="text-slate-500">Fecha entrega / vencimiento: </span><span className="font-mono">{detail.docDueDate || '—'}</span></div>
                    <div><span className="text-slate-500">Fecha contabilización: </span><span className="font-mono">{detail.taxDate || '—'}</span></div>
                    <div><span className="text-slate-500">Comprador: </span>{detail.buyerName || '—'}{detail.buyerCode !== null && ` (Cód. ${detail.buyerCode})`}</div>
                    <div><span className="text-slate-500">Condición de pago: </span>{String(detail.paymentGroup)}</div>
                  </div>
                  <div className="md:col-span-2 p-4 rounded-2xl bg-white border border-slate-200">
                    <h4 className="font-bold uppercase text-slate-500 mb-1.5">Comentarios</h4>
                    <p className="font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">{detail.comments ? <LinkifiedText text={detail.comments} /> : 'Sin comentarios.'}</p>
                  </div>
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
          <span className="text-slate-500">Service Layer v1 • {isDraft ? 'Drafts (ODRF)' : kind === 'purchase-orders' ? 'PurchaseOrders (OPOR)' : 'PurchaseDeliveryNotes (OPDN)'}</span>
          {editing ? (
            <div className="flex gap-2 font-bold">
              <button onClick={() => setEditing(false)} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100">
                Descartar
              </button>
              <button onClick={() => run('update', true)} disabled={busy} className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" /> Simular
              </button>
              <button onClick={() => setPending('update')} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
                <Save className="h-4 w-4" /> Guardar en SAP
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
              Cerrar detalle
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending === 'update' ? `¿Guardar cambios en SAP?` : pendingText?.title || ''}
        message={
          pending === 'update'
            ? 'Se enviará una actualización parcial (PATCH) con solo los campos modificados.'
            : `${pendingText?.body || ''} Documento ${detail?.docNum || ''}.`
        }
        confirmLabel={pending === 'update' ? 'Sí, guardar' : pendingText?.confirm}
        tone={pending === 'update' ? 'primary' : pendingText?.tone}
        isBusy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && run(pending)}
      />
    </div>
  );
};
