'use client';

import React, { useState } from 'react';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { X, RefreshCw, AlertCircle, Ban, Lock, Trash2, FileCheck2, FlaskConical, Save, Pencil } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { InvDocDetail, InvDocKind, InvHeaderKey, InvLineInput } from '@/types/inventory';
import { money, qty, sapWrite, WriteResult } from '@/lib/comprasApi';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SapLookupInput } from '../common/SapLookupInput';
import { WriteFeedback } from '../compras/WriteFeedback';
import { HEADER_FIELD_LABEL, INV_META, PRICE_SOURCE_LABEL, inputCls, statusBadgeClass } from './inventoryMeta';
import { EditLine, InventoryLinesEditor, linesToInput } from './InventoryLinesEditor';

interface Props {
  kind: InvDocKind;
  docId: string; // EI-1 | DRF-1 | ...
  onClose: () => void;
  onChanged: () => void;
}

type Action = 'cancel' | 'close' | 'delete' | 'save-draft-to-document' | 'update';

interface LineEdit {
  quantity?: string;
  countedQuantity?: string;
  remarks?: string;
}

const ACTION_TEXT: Record<Exclude<Action, 'update'>, { label: string; tone: 'danger' | 'warning' | 'primary'; message: string }> = {
  cancel: {
    label: 'Cancelar documento',
    tone: 'danger',
    message: 'SAP creará el documento de cancelación (revierte existencias y asiento). Esta acción no se puede deshacer.'
  },
  close: { label: 'Cerrar documento', tone: 'warning', message: 'El documento quedará cerrado y no podrá modificarse ni copiarse.' },
  delete: { label: 'Eliminar borrador', tone: 'danger', message: 'El borrador se eliminará definitivamente de SAP.' },
  'save-draft-to-document': {
    label: 'Convertir en documento',
    tone: 'primary',
    message: 'El borrador se contabilizará como documento definitivo en SAP (afecta existencias).'
  }
};

/** Detalle de un documento de inventario con edición y acciones permitidas por el Service Layer */
export const InventoryDocumentDetailModal: React.FC<Props> = ({ kind, docId, onClose, onChanged }) => {
  const meta = INV_META[kind];
  const q = useSapQuery<InvDocDetail>(`/api/sap/inventory/${kind}/${encodeURIComponent(docId)}`);
  const doc = q.data;

  const [editing, setEditing] = useState(false);
  const [headerEdit, setHeaderEdit] = useState<Partial<Record<InvHeaderKey, string>>>({});
  const [lineEdits, setLineEdits] = useState<Record<number, LineEdit>>({});
  const [newLines, setNewLines] = useState<EditLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);

  const base = `/api/sap/inventory/${kind}/${encodeURIComponent(docId)}`;
  const mode = meta.lineMode;

  const startEdit = () => {
    if (!doc) return;
    const h: Partial<Record<InvHeaderKey, string>> = {};
    for (const k of doc.editableHeader) h[k] = headerValue(doc, k);
    setHeaderEdit(h);
    setLineEdits({});
    setNewLines([]);
    setResult(null);
    setEditing(true);
  };

  const buildPatch = (): Record<string, unknown> => {
    if (!doc) return {};
    const body: Record<string, unknown> = {};
    for (const k of doc.editableHeader) {
      const v = headerEdit[k] ?? '';
      if (v !== headerValue(doc, k)) body[k] = v;
    }
    if (doc.allowed.updateLines) {
      const lines: InvLineInput[] = [];
      for (const l of doc.lines) {
        const e = lineEdits[l.lineNum];
        if (!e) continue;
        const out: InvLineInput = { lineNum: l.lineNum };
        if (e.quantity !== undefined && e.quantity !== '' && Number(e.quantity) !== l.quantity) out.quantity = Number(e.quantity);
        if (e.countedQuantity !== undefined && e.countedQuantity !== '' && Number(e.countedQuantity) !== l.countedQuantity)
          out.countedQuantity = Number(e.countedQuantity);
        if (e.remarks !== undefined && e.remarks !== l.remarks) out.remarks = e.remarks;
        if (Object.keys(out).length > 1) lines.push(out);
      }
      lines.push(...linesToInput(mode, newLines));
      if (lines.length > 0) body.lines = lines;
    }
    return body;
  };

  const run = async (action: Action, dryRun: boolean) => {
    setConfirm(null);
    setBusy(true);
    let r: WriteResult;
    if (action === 'update') r = await sapWrite(base, 'PATCH', buildPatch(), { dryRun });
    else if (action === 'delete') r = await sapWrite(base, 'DELETE', undefined, { dryRun });
    else r = await sapWrite(`${base}/${action}`, 'POST', undefined, { dryRun });
    setResult(r);
    setBusy(false);
    if (r.ok && !r.dryRun) {
      onChanged();
      if (action === 'delete' || action === 'save-draft-to-document') onClose();
      else {
        setEditing(false);
        q.reload();
      }
    }
  };

  const actions: Exclude<Action, 'update'>[] = doc
    ? (['save-draft-to-document', 'close', 'cancel', 'delete'] as const).filter((a) =>
        a === 'save-draft-to-document' ? doc.allowed.saveDraftToDocument : doc.allowed[a]
      )
    : [];

  const editableLine = (status: string) => doc?.allowed.updateLines && editing && status === 'Abierta';
  const isCount = mode === 'counting' || mode === 'posting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-extrabold text-slate-900">
              {doc?.source === 'drafts' ? 'Borrador de ' : ''}
              {meta.label} {doc ? `N° ${doc.docNum}` : ''}
            </h3>
            {doc && <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${statusBadgeClass(doc.status)}`}>{doc.status}</span>}
            <span className="text-[11px] text-slate-500 font-mono">{meta.table}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={q.reload} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Recargar">
              <RefreshCw className={`h-4 w-4 ${q.isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {q.isLoading && !doc && (
            <div className="py-16 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
              <div className="text-xs text-slate-600 mt-2">Consultando SAP Service Layer...</div>
            </div>
          )}
          {q.error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {q.error}
            </div>
          )}

          {doc && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <Info label="Fecha" value={doc.date} />
                {kind === 'transfer-requests' && <Info label="Fecha requerida" value={doc.dueDate} />}
                {meta.lineMode === 'transfer' && <Info label="Almacén origen" value={doc.fromWarehouse} mono />}
                {meta.lineMode === 'transfer' && <Info label="Almacén destino" value={doc.toWarehouse} mono />}
                {doc.cardName && <Info label="Socio de negocio" value={`${doc.cardCode} ${doc.cardName}`} />}
                <Info label="Referencia 2" value={doc.reference2} mono />
                {doc.journalMemo && <Info label="Comentario asiento" value={doc.journalMemo} />}
                {doc.docTotal !== null && <Info label="Total" value={`${doc.currency} ${money(doc.docTotal)}`} mono />}
                {kind === 'postings' && <Info label="Fuente de precio" value={PRICE_SOURCE_LABEL[doc.priceSource] || doc.priceSource} />}
                {kind === 'countings' && <Info label="Tipo de recuento" value={doc.countingType === 'ctMultipleCounters' ? 'Varios contadores' : 'Un contador'} />}
                <div className="col-span-2 md:col-span-4">
                  <Info label="Comentarios" value={doc.comments} />
                </div>
              </div>

              {editing && doc.editableHeader.length > 0 && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {doc.editableHeader.map((k) => (
                    <div key={k} className={k === 'comments' ? 'md:col-span-3' : ''}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{HEADER_FIELD_LABEL[k]}</label>
                      <HeaderInput k={k} value={headerEdit[k] ?? ''} onChange={(v) => setHeaderEdit((h) => ({ ...h, [k]: v }))} />
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-[10.5px] uppercase font-bold">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Artículo</th>
                      <th className="p-2 text-left">Descripción</th>
                      {mode === 'transfer' && <th className="p-2 text-left">Origen</th>}
                      <th className="p-2 text-left">{mode === 'transfer' ? 'Destino' : 'Almacén'}</th>
                      {!isCount && <th className="p-2 text-right">Cantidad</th>}
                      {kind === 'transfer-requests' && <th className="p-2 text-right">Pendiente</th>}
                      {isCount && <th className="p-2 text-right">En almacén</th>}
                      {isCount && <th className="p-2 text-right">Contado</th>}
                      {isCount && <th className="p-2 text-right">Diferencia</th>}
                      {mode === 'gen' && <th className="p-2 text-right">Precio</th>}
                      {mode === 'gen' && <th className="p-2 text-right">Total</th>}
                      {isCount && <th className="p-2 text-left">Comentario</th>}
                      <th className="p-2 text-left">UM</th>
                      {mode !== 'posting' && <th className="p-2 text-center">Estado</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doc.lines.map((l) => {
                      const canEdit = editableLine(l.lineStatus);
                      const e = lineEdits[l.lineNum] || {};
                      const setE = (patch: LineEdit) => setLineEdits((m) => ({ ...m, [l.lineNum]: { ...m[l.lineNum], ...patch } }));
                      return (
                        <tr key={l.lineNum}>
                          <td className="p-2 font-mono text-slate-500">{l.lineNum}</td>
                          <td className="p-2 font-mono font-bold">{l.itemCode}</td>
                          <td className="p-2 max-w-[260px] truncate" title={l.description}>
                            {l.description}
                          </td>
                          {mode === 'transfer' && <td className="p-2 font-mono">{l.fromWarehouseCode}</td>}
                          <td className="p-2 font-mono">{l.warehouseCode}</td>
                          {!isCount && (
                            <td className="p-2 text-right font-mono">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className={`${inputCls} w-24 text-right`}
                                  value={e.quantity ?? String(l.quantity)}
                                  onChange={(ev) => setE({ quantity: ev.target.value })}
                                />
                              ) : (
                                qty(l.quantity)
                              )}
                            </td>
                          )}
                          {kind === 'transfer-requests' && <td className="p-2 text-right font-mono">{l.openQuantity === null ? '—' : qty(l.openQuantity)}</td>}
                          {isCount && <td className="p-2 text-right font-mono">{l.inWarehouseQuantity === null ? '—' : qty(l.inWarehouseQuantity)}</td>}
                          {isCount && (
                            <td className="p-2 text-right font-mono">
                              {canEdit && mode === 'counting' ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className={`${inputCls} w-24 text-right`}
                                  value={e.countedQuantity ?? (l.countedQuantity === null ? '' : String(l.countedQuantity))}
                                  onChange={(ev) => setE({ countedQuantity: ev.target.value })}
                                />
                              ) : l.countedQuantity === null ? (
                                '—'
                              ) : (
                                qty(l.countedQuantity)
                              )}
                            </td>
                          )}
                          {isCount && (
                            <td className={`p-2 text-right font-mono ${l.variance && l.variance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {l.variance === null ? '—' : qty(l.variance)}
                            </td>
                          )}
                          {mode === 'gen' && <td className="p-2 text-right font-mono">{money(l.price)}</td>}
                          {mode === 'gen' && <td className="p-2 text-right font-mono">{money(l.lineTotal)}</td>}
                          {isCount && (
                            <td className="p-2">
                              {canEdit && mode === 'counting' ? (
                                <input type="text" maxLength={254} className={inputCls} value={e.remarks ?? l.remarks} onChange={(ev) => setE({ remarks: ev.target.value })} />
                              ) : (
                                l.remarks || '—'
                              )}
                            </td>
                          )}
                          <td className="p-2">{l.uom}</td>
                          {mode !== 'posting' && (
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.lineStatus === 'Cerrada' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                                {l.lineStatus}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {doc.lines.length === 0 && (
                      <tr>
                        <td colSpan={14} className="p-4 text-center text-slate-500">
                          El documento no tiene líneas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {editing && doc.allowed.updateLines && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Agregar líneas</div>
                  <InventoryLinesEditor mode={mode} lines={newLines} onChange={setNewLines} disabled={busy} addLabel="Nueva línea" />
                </div>
              )}

              <WriteFeedback result={result} />
            </>
          )}
        </div>

        {doc && (
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <div key={a} className="flex">
                  <button
                    onClick={() => setConfirm(a)}
                    disabled={busy || editing}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-l-xl text-white text-xs font-bold disabled:opacity-40 ${
                      ACTION_TEXT[a].tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : ACTION_TEXT[a].tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {a === 'cancel' ? <Ban className="h-4 w-4" /> : a === 'close' ? <Lock className="h-4 w-4" /> : a === 'delete' ? <Trash2 className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
                    {ACTION_TEXT[a].label}
                  </button>
                  <button
                    onClick={() => run(a, true)}
                    disabled={busy || editing}
                    title="Simular (no envía a SAP)"
                    className="px-2 rounded-r-xl border border-l-0 border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                  >
                    <FlaskConical className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {actions.length === 0 && !doc.allowed.update && (
                <span className="text-[11px] text-slate-500">Sin acciones disponibles en el estado actual ({doc.status}).</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.allowed.update && !editing && (
                <button onClick={startEdit} disabled={busy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-300 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50">
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              )}
              {editing && (
                <>
                  <button onClick={() => setEditing(false)} disabled={busy} className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700">
                    Descartar
                  </button>
                  <button
                    onClick={() => run('update', true)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-bold hover:bg-indigo-100"
                  >
                    <FlaskConical className="h-4 w-4" /> Simular
                  </button>
                  <button
                    onClick={() => setConfirm('update')}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    <Save className="h-4 w-4" /> Guardar en SAP
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'update' ? `Actualizar ${meta.label}` : confirm ? ACTION_TEXT[confirm].label : ''}
        message={confirm === 'update' ? 'Se enviarán los cambios (PATCH) a SAP Business One.' : confirm ? ACTION_TEXT[confirm].message : ''}
        confirmLabel="Confirmar"
        tone={confirm && confirm !== 'update' ? ACTION_TEXT[confirm].tone : 'primary'}
        isBusy={busy}
        onConfirm={() => confirm && run(confirm, false)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

function headerValue(doc: InvDocDetail, k: InvHeaderKey): string {
  switch (k) {
    case 'date':
      return doc.date;
    case 'dueDate':
      return doc.dueDate;
    case 'comments':
      return doc.comments;
    case 'reference2':
      return doc.reference2;
    case 'journalMemo':
      return doc.journalMemo;
    case 'fromWarehouse':
      return doc.fromWarehouse;
    case 'toWarehouse':
      return doc.toWarehouse;
    case 'priceSource':
      return doc.priceSource;
  }
}

const Info: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
    <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
    <div className={`text-slate-900 font-semibold break-words ${mono ? 'font-mono' : ''}`}>{value ? <LinkifiedText text={value} /> : '—'}</div>
  </div>
);

const HeaderInput: React.FC<{ k: InvHeaderKey; value: string; onChange: (v: string) => void }> = ({ k, value, onChange }) => {
  if (k === 'date' || k === 'dueDate') return <input type="date" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />;
  if (k === 'fromWarehouse' || k === 'toWarehouse') return <SapLookupInput type="warehouses" value={value} onChange={(c) => onChange(c)} />;
  if (k === 'priceSource')
    return (
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(PRICE_SOURCE_LABEL).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    );
  if (k === 'comments') return <textarea rows={2} maxLength={254} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />;
  return <input type="text" maxLength={k === 'reference2' ? 11 : 50} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />;
};
