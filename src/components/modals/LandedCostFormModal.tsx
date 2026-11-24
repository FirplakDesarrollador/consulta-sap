'use client';

import React, { useState } from 'react';
import { X, Calculator, Plus, Trash2, RefreshCw, FlaskConical, Send, Search } from 'lucide-react';
import { PurchaseDocDetail } from '@/types/sapBusiness';
import { SapLookupInput } from '../common/SapLookupInput';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { money, qty, sapWrite, today, WriteResult } from '@/lib/comprasApi';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface ItemSel {
  key: string;
  receiptNum: string;
  baseEntry: number;
  baseLine: number;
  itemCode: string;
  description: string;
  quantity: number;
  lineTotal: number;
  selected: boolean;
}

interface CostLine {
  key: string;
  landedCostCode: string;
  amount: number | '';
}

const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600';

let seq = 0;

/** Crear Precio de Entrega (OIPF) a partir de líneas de Entradas de Mercancía (OPDN) */
export const LandedCostFormModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [postingDate, setPostingDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [reference, setReference] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<ItemSel[]>([]);
  const [costs, setCosts] = useState<CostLine[]>([{ key: `c${++seq}`, landedCostCode: '', amount: '' }]);
  const [receiptNum, setReceiptNum] = useState('');
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);

  const loadReceipt = async () => {
    const n = receiptNum.trim();
    if (!/^\d+$/.test(n)) {
      setLoadError('Ingrese el número (DocNum) de la entrada de mercancía');
      return;
    }
    setLoadingReceipt(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/sap/purchasing/goods-receipts/${n}?by=docnum`);
      const json = await res.json();
      if (!json.success || !json.data) {
        setLoadError(json.error || `No se encontró la entrada ${n}`);
        return;
      }
      const d = json.data as PurchaseDocDetail;
      if (d.status === 'Cancelado') {
        setLoadError(`La entrada ${d.docNum} está cancelada`);
        return;
      }
      setItems((prev) => {
        const existing = new Set(prev.map((p) => `${p.baseEntry}-${p.baseLine}`));
        const added = d.lines
          .filter((l) => l.itemCode && !existing.has(`${d.docEntry}-${l.lineNum}`))
          .map((l) => ({
            key: `i${++seq}`,
            receiptNum: d.docNum,
            baseEntry: d.docEntry,
            baseLine: l.lineNum,
            itemCode: l.itemCode,
            description: l.description,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            selected: true
          }));
        return [...prev, ...added];
      });
      setReceiptNum('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Error al consultar SAP');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const body = () => ({
    postingDate: postingDate || undefined,
    dueDate: dueDate || undefined,
    vendorCode: vendorCode || undefined,
    reference: reference || undefined,
    fileNumber: fileNumber || undefined,
    remarks: remarks || undefined,
    itemLines: items.filter((i) => i.selected).map((i) => ({ baseEntry: i.baseEntry, baseLine: i.baseLine })),
    costLines: costs.filter((c) => c.landedCostCode).map((c) => ({ landedCostCode: c.landedCostCode, amount: Number(c.amount) }))
  });

  const clientErrors = () => {
    const e: string[] = [];
    if (!items.some((i) => i.selected)) e.push('Seleccione al menos una línea de entrada de mercancía');
    const valid = costs.filter((c) => c.landedCostCode);
    if (valid.length === 0) e.push('Agregue al menos un costo');
    valid.forEach((c, i) => {
      if (c.amount === '' || Number(c.amount) < 0) e.push(`Costo ${i + 1}: importe inválido`);
    });
    return e;
  };

  const submit = async (dryRun: boolean) => {
    const errs = clientErrors();
    if (errs.length) {
      setResult({ ok: false, message: errs.join(' • ') });
      setConfirm(false);
      return;
    }
    setBusy(true);
    const r = await sapWrite('/api/sap/landed-costs', 'POST', body(), { dryRun });
    setBusy(false);
    setConfirm(false);
    setResult(r);
    if (r.ok && !r.dryRun) onCreated();
  };

  const totalCosts = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 text-white rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Nuevo Precio de Entrega</h3>
              <p className="text-xs text-slate-500">POST /LandedCosts • basado en Entradas de Mercancía (OPDN)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 border border-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <WriteFeedback result={result} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Agente / proveedor (opcional)</label>
              <SapLookupInput type="suppliers" value={vendorCode} onChange={(c) => setVendorCode(c)} placeholder="Código o nombre..." />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha contabilización</label>
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vencimiento</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Referencia</label>
              <input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">N° expediente</label>
              <input value={fileNumber} maxLength={50} onChange={(e) => setFileNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Comentarios</label>
              <input value={remarks} maxLength={254} onChange={(e) => setRemarks(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-800 mr-auto">Líneas de artículos ({items.filter((i) => i.selected).length} seleccionadas)</span>
              <input
                value={receiptNum}
                onChange={(e) => setReceiptNum(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    loadReceipt();
                  }
                }}
                placeholder="N° entrada de mercancía"
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg w-48 font-mono"
              />
              <button onClick={loadReceipt} disabled={loadingReceipt} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1">
                {loadingReceipt ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Cargar entrada
              </button>
            </div>
            {loadError && <div className="px-4 py-2 text-xs text-rose-700 bg-rose-50">{loadError}</div>}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-600 uppercase text-[10px] font-bold">
                  <th className="py-2 px-3 w-8"></th>
                  <th className="py-2 px-3 text-left">Entrada</th>
                  <th className="py-2 px-3 text-left">Línea</th>
                  <th className="py-2 px-3 text-left">Artículo</th>
                  <th className="py-2 px-3 text-right">Cantidad</th>
                  <th className="py-2 px-3 text-right">Total línea</th>
                  <th className="py-2 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">Cargue una o varias entradas de mercancía por su número.</td>
                  </tr>
                ) : (
                  items.map((i) => (
                    <tr key={i.key}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={i.selected}
                          onChange={(e) => setItems((p) => p.map((x) => (x.key === i.key ? { ...x, selected: e.target.checked } : x)))}
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">{i.receiptNum}</td>
                      <td className="py-2 px-3 font-mono">{i.baseLine}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-violet-700">{i.itemCode}</span> <span className="text-slate-500">{i.description}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{qty(i.quantity)}</td>
                      <td className="py-2 px-3 text-right font-mono">{money(i.lineTotal)}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Costos (total {money(totalCosts)})</span>
              <button
                onClick={() => setCosts((p) => [...p, { key: `c${++seq}`, landedCostCode: '', amount: '' }])}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar costo
              </button>
            </div>
            <div className="p-3 space-y-2">
              {costs.map((c) => (
                <div key={c.key} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <SapLookupInput
                      type="landed-cost-codes"
                      value={c.landedCostCode}
                      placeholder="Código de gasto (OALC)..."
                      onChange={(code) => setCosts((p) => p.map((x) => (x.key === c.key ? { ...x, landedCostCode: code } : x)))}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={c.amount}
                      placeholder="Importe"
                      onChange={(e) =>
                        setCosts((p) => p.map((x) => (x.key === c.key ? { ...x, amount: e.target.value === '' ? '' : Number(e.target.value) } : x)))
                      }
                      className={`${inputCls} text-right font-mono`}
                    />
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => setCosts((p) => p.filter((x) => x.key !== c.key))} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs font-bold">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-300 bg-white">
            Cerrar
          </button>
          <button onClick={() => submit(true)} disabled={busy} className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4" /> Simular
          </button>
          <button onClick={() => setConfirm(true)} disabled={busy} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5">
            <Send className="h-4 w-4" /> Crear en SAP
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="¿Crear precio de entrega en SAP?"
        message={`Se asignarán ${money(totalCosts)} en costos a ${items.filter((i) => i.selected).length} línea(s) de entradas de mercancía. Esto afecta el costo del inventario.`}
        confirmLabel="Sí, crear en SAP"
        tone="warning"
        isBusy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => submit(false)}
      />
    </div>
  );
};
