'use client';

import React, { useState } from 'react';
import { X, FlaskConical, Save, FileText, Download, RefreshCw } from 'lucide-react';
import { InvDocDetail, InvDocKind, InvHeaderKey } from '@/types/inventory';
import { sapWrite, today, WriteResult } from '@/lib/comprasApi';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SapLookupInput } from '../common/SapLookupInput';
import { WriteFeedback } from '../compras/WriteFeedback';
import { HEADER_FIELD_LABEL, INV_META, PRICE_SOURCE_LABEL, inputCls } from './inventoryMeta';
import { EditLine, InventoryLinesEditor, linesToInput, newLine } from './InventoryLinesEditor';

interface Props {
  kind: InvDocKind;
  onClose: () => void;
  onCreated: () => void;
}

type Mode = 'dry' | 'document' | 'draft';

/** Creación de documentos de inventario (o borradores) vía POST /api/sap/inventory/[kind] */
export const InventoryDocumentFormModal: React.FC<Props> = ({ kind, onClose, onCreated }) => {
  const meta = INV_META[kind];
  const [header, setHeader] = useState<Partial<Record<InvHeaderKey, string>>>(() => ({
    date: today(),
    ...(kind === 'postings' ? { priceSource: 'ippsLastEvaluatedPrice' } : {})
  }));
  const [lines, setLines] = useState<EditLine[]>(() => [newLine()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [confirm, setConfirm] = useState<Mode | null>(null);
  const [copyNum, setCopyNum] = useState('');
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  const setH = (k: InvHeaderKey, v: string) => setHeader((h) => ({ ...h, [k]: v }));

  const buildBody = (asDraft: boolean) => {
    const body: Record<string, unknown> = {};
    for (const k of meta.createHeader) {
      const v = (header[k] || '').trim();
      if (v) body[k] = v;
    }
    body.lines = linesToInput(meta.lineMode, lines);
    if (asDraft) body.asDraft = true;
    return body;
  };

  const submit = async (mode: Mode) => {
    setConfirm(null);
    setBusy(true);
    const r = await sapWrite(`/api/sap/inventory/${kind}`, 'POST', buildBody(mode === 'draft'), { dryRun: mode === 'dry' });
    setResult(r);
    setBusy(false);
    if (r.ok && !r.dryRun) onCreated();
  };

  /** Copia líneas abiertas desde una solicitud de traslado o desde un recuento */
  const loadCopy = async () => {
    if (!meta.copyFrom || !/^\d+$/.test(copyNum.trim())) return;
    setCopyLoading(true);
    setCopyMsg(null);
    try {
      const res = await fetch(`/api/sap/inventory/${meta.copyFrom.kind}/${copyNum.trim()}?by=docnum`);
      const json = await res.json();
      if (!json.success) {
        setCopyMsg(json.error || 'No encontrado');
        return;
      }
      const d = json.data as InvDocDetail;
      if (d.status !== 'Abierto') {
        setCopyMsg(`${meta.copyFrom.label} ${d.docNum} está ${d.status.toLowerCase()}: SAP no permite copiarla.`);
        return;
      }
      const label = `Base: ${meta.copyFrom.label} ${d.docNum} / línea `;
      let copied: EditLine[];
      if (kind === 'transfers') {
        copied = d.lines
          .filter((l) => l.lineStatus === 'Abierta' && (l.openQuantity ?? l.quantity) > 0)
          .map((l) =>
            newLine({
              itemCode: l.itemCode,
              description: l.description,
              quantity: l.openQuantity ?? l.quantity,
              fromWarehouseCode: l.fromWarehouseCode,
              warehouseCode: l.warehouseCode,
              baseEntry: d.docEntry,
              baseLine: l.lineNum,
              baseLabel: `${label}${l.lineNum}`
            })
          );
        setHeader((h) => ({ ...h, fromWarehouse: d.fromWarehouse || h.fromWarehouse, toWarehouse: d.toWarehouse || h.toWarehouse }));
      } else {
        copied = d.lines
          .filter((l) => l.counted)
          .map((l) =>
            newLine({
              itemCode: l.itemCode,
              description: l.description,
              warehouseCode: l.warehouseCode,
              countedQuantity: l.countedQuantity ?? '',
              remarks: l.remarks,
              baseEntry: d.docEntry,
              baseLine: l.lineNum,
              baseLabel: `${label}${l.lineNum}`
            })
          );
      }
      if (copied.length === 0) {
        setCopyMsg('El documento no tiene líneas pendientes para copiar.');
        return;
      }
      setLines(copied);
      setCopyMsg(`${copied.length} línea(s) copiadas desde ${meta.copyFrom.label} ${d.docNum}.`);
    } catch (e: unknown) {
      setCopyMsg(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setCopyLoading(false);
    }
  };

  const renderHeaderField = (k: InvHeaderKey) => {
    if (k === 'date' || k === 'dueDate') {
      return <input type="date" className={inputCls} value={header[k] || ''} onChange={(e) => setH(k, e.target.value)} />;
    }
    if (k === 'fromWarehouse' || k === 'toWarehouse') {
      return <SapLookupInput type="warehouses" value={header[k] || ''} onChange={(c) => setH(k, c)} placeholder="Código de almacén" />;
    }
    if (k === 'priceSource') {
      return (
        <select className={inputCls} value={header[k] || ''} onChange={(e) => setH(k, e.target.value)}>
          {Object.entries(PRICE_SOURCE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      );
    }
    if (k === 'comments') {
      return <textarea rows={2} maxLength={254} className={inputCls} value={header[k] || ''} onChange={(e) => setH(k, e.target.value)} />;
    }
    return (
      <input type="text" maxLength={k === 'reference2' ? 11 : 50} className={inputCls} value={header[k] || ''} onChange={(e) => setH(k, e.target.value)} />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Nueva {meta.label}</h3>
            <p className="text-[11px] text-slate-500">
              POST /b1s/v1/{meta.entity} ({meta.table})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {meta.copyFrom && (
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-2">
              <div className="text-xs font-bold text-indigo-900">Copiar desde {meta.copyFrom.label} (opcional)</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={copyNum}
                  onChange={(e) => setCopyNum(e.target.value)}
                  placeholder="N° de documento"
                  className={`${inputCls} max-w-[180px]`}
                />
                <button
                  type="button"
                  onClick={loadCopy}
                  disabled={copyLoading || !/^\d+$/.test(copyNum.trim())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-40"
                >
                  {copyLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Cargar líneas
                </button>
                {copyMsg && <span className="text-[11px] text-indigo-900 font-semibold">{copyMsg}</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {meta.createHeader.map((k) => (
              <div key={k} className={k === 'comments' ? 'md:col-span-3' : ''}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {HEADER_FIELD_LABEL[k]}
                  {(k === 'fromWarehouse' || k === 'toWarehouse') && <span className="text-rose-600"> *</span>}
                </label>
                {renderHeaderField(k)}
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Líneas</div>
            <InventoryLinesEditor mode={meta.lineMode} lines={lines} onChange={setLines} disabled={busy} />
            {meta.lineMode === 'gen' && (
              <p className="mt-2 text-[11px] text-slate-500">
                Artículos gestionados por serie o lote requieren asignar números de serie/lote: SAP rechazará la línea si no se envían.
              </p>
            )}
          </div>

          <WriteFeedback result={result} />
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100">
            Cerrar
          </button>
          <button
            onClick={() => submit('dry')}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-bold hover:bg-indigo-100 disabled:opacity-40"
          >
            <FlaskConical className="h-4 w-4" /> Simular (no envía)
          </button>
          {meta.hasDrafts && (
            <button
              onClick={() => setConfirm('draft')}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40"
            >
              <FileText className="h-4 w-4" /> Guardar borrador
            </button>
          )}
          <button
            onClick={() => setConfirm('document')}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Crear en SAP
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'draft' ? `Guardar borrador de ${meta.label}` : `Crear ${meta.label}`}
        message={
          confirm === 'draft'
            ? 'Se creará un borrador en SAP Business One. No afecta existencias hasta convertirlo en documento.'
            : `Se creará ${meta.label} en SAP Business One${meta.lineMode === 'counting' ? '' : ' y afectará existencias/contabilidad'}. ¿Continuar?`
        }
        confirmLabel={confirm === 'draft' ? 'Guardar borrador' : 'Crear'}
        tone="primary"
        isBusy={busy}
        onConfirm={() => confirm && submit(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};
