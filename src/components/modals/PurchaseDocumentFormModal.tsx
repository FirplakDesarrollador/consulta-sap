'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, FilePlus2, RefreshCw, FlaskConical, Save, Download } from 'lucide-react';
import { PurchaseDocDetail, PurchaseDocKind, PurchaseLineInput } from '@/types/sapBusiness';
import { SapLookupInput } from '../common/SapLookupInput';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { sapWrite, today, WriteResult } from '@/lib/comprasApi';

interface FormLine extends PurchaseLineInput {
  key: string;
  description?: string;
}

interface PurchaseDocumentFormModalProps {
  kind: PurchaseDocKind;
  label: string;
  onClose: () => void;
  onCreated: () => void;
}

let lineSeq = 0;
const newLine = (partial: Partial<FormLine> = {}): FormLine => ({
  key: `l${++lineSeq}`,
  itemCode: '',
  quantity: 1,
  price: undefined,
  warehouseCode: '',
  taxCode: '',
  ...partial
});

const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600';

/**
 * Formulario de creación de Orden de Compra (POST /PurchaseOrders) o Entrada de Mercancía
 * (POST /PurchaseDeliveryNotes), con opción de guardar como borrador (POST /Drafts) o simular.
 */
export const PurchaseDocumentFormModal: React.FC<PurchaseDocumentFormModalProps> = ({ kind, label, onClose, onCreated }) => {
  const [cardCode, setCardCode] = useState('');
  const [cardName, setCardName] = useState('');
  const [docDate, setDocDate] = useState(today());
  const [docDueDate, setDocDueDate] = useState('');
  const [taxDate, setTaxDate] = useState('');
  const [numAtCard, setNumAtCard] = useState('');
  const [comments, setComments] = useState('');
  const [lines, setLines] = useState<FormLine[]>([newLine()]);
  const [basePoNum, setBasePoNum] = useState('');
  const [loadingBase, setLoadingBase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [confirm, setConfirm] = useState<null | 'document' | 'draft'>(null);

  const updateLine = (key: string, patch: Partial<FormLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const buildBody = (asDraft: boolean) => ({
    cardCode: cardCode.trim(),
    docDate: docDate || undefined,
    docDueDate: docDueDate || undefined,
    taxDate: taxDate || undefined,
    numAtCard: numAtCard || undefined,
    comments: comments || undefined,
    asDraft,
    lines: lines.map((l) => ({
      itemCode: l.itemCode.trim(),
      quantity: Number(l.quantity),
      price: l.price === undefined || l.price === null || String(l.price) === '' ? undefined : Number(l.price),
      warehouseCode: l.warehouseCode?.trim() || undefined,
      taxCode: l.taxCode?.trim() || undefined,
      baseEntry: l.baseEntry,
      baseLine: l.baseLine
    }))
  });

  const clientErrors = (): string[] => {
    const e: string[] = [];
    if (!cardCode.trim()) e.push('Seleccione el proveedor');
    if (kind === 'purchase-orders' && !docDueDate) e.push('Indique la fecha de entrega');
    if (lines.length === 0) e.push('Agregue al menos una línea');
    lines.forEach((l, i) => {
      if (!l.itemCode.trim() && l.baseEntry === undefined) e.push(`Línea ${i + 1}: artículo obligatorio`);
      if (!(Number(l.quantity) > 0)) e.push(`Línea ${i + 1}: cantidad debe ser > 0`);
    });
    return e;
  };

  const submit = async (mode: 'dry' | 'document' | 'draft') => {
    const errs = clientErrors();
    if (errs.length) {
      setResult({ ok: false, message: errs.join(' • ') });
      setConfirm(null);
      return;
    }
    setBusy(true);
    const r = await sapWrite(`/api/sap/purchasing/${kind}`, 'POST', buildBody(mode === 'draft'), { dryRun: mode === 'dry' });
    setBusy(false);
    setConfirm(null);
    setResult(r);
    if (r.ok && !r.dryRun) onCreated();
  };

  const loadBasePurchaseOrder = async () => {
    const n = basePoNum.trim();
    if (!/^\d+$/.test(n)) {
      setResult({ ok: false, message: 'Ingrese el número (DocNum) de la orden de compra' });
      return;
    }
    setLoadingBase(true);
    setResult(null);
    try {
      const res = await fetch(`/api/sap/purchasing/purchase-orders/${n}?by=docnum`);
      const json = await res.json();
      if (!json.success) {
        setResult({ ok: false, message: json.error || 'Orden de compra no encontrada' });
        return;
      }
      const po = json.data as PurchaseDocDetail;
      if (po.status !== 'Abierto') {
        setResult({ ok: false, message: `La orden ${po.docNum} está ${po.status.toLowerCase()}; no se puede recibir` });
        return;
      }
      setCardCode(po.cardCode);
      setCardName(po.cardName);
      if (po.numAtCard) setNumAtCard(po.numAtCard);
      setComments(`Basado en Orden de Compra ${po.docNum}`);
      const open = po.lines.filter((l) => l.lineStatus === 'Abierta' && l.openQuantity > 0);
      setLines(
        open.map((l) =>
          newLine({
            itemCode: l.itemCode,
            description: l.description,
            quantity: l.openQuantity,
            price: l.price,
            warehouseCode: l.whsCode,
            taxCode: l.taxCode,
            baseEntry: po.docEntry,
            baseLine: l.lineNum
          })
        )
      );
      setResult({ ok: true, message: `Cargadas ${open.length} líneas abiertas de la OC ${po.docNum}` });
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Error al consultar la OC' });
    } finally {
      setLoadingBase(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Nueva {label}</h3>
              <p className="text-[11px] text-slate-500">Se envía al SAP Service Layer solo al confirmar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {kind === 'goods-receipts' && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Basado en Orden de Compra (N° OC)</label>
                <input value={basePoNum} onChange={(e) => setBasePoNum(e.target.value)} placeholder="Ej: 2032028" className={`${inputCls} w-48 font-mono`} />
              </div>
              <button
                type="button"
                onClick={loadBasePurchaseOrder}
                disabled={loadingBase}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {loadingBase ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Copiar líneas abiertas
              </button>
              <span className="text-[11px] text-slate-500">Opcional: enlaza las líneas a la OC (BaseType 22) para que SAP descuente lo pendiente.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white border border-slate-200">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Proveedor (CardCode) *</label>
              <SapLookupInput
                type="suppliers"
                value={cardCode}
                placeholder="Buscar por código, nombre o NIT del proveedor..."
                onChange={(code, opt) => {
                  setCardCode(code);
                  setCardName(opt ? opt.name : '');
                }}
              />
              {cardName && <div className="text-[11px] text-slate-600 mt-1 font-semibold">{cardName}</div>}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Ref. proveedor (NumAtCard)</label>
              <input value={numAtCard} onChange={(e) => setNumAtCard(e.target.value)} maxLength={100} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha documento (DocDate)</label>
              <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Fecha entrega (DocDueDate){kind === 'purchase-orders' ? ' *' : ''}
              </label>
              <input type="date" value={docDueDate} onChange={(e) => setDocDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha contabilización (TaxDate)</label>
              <input type="date" value={taxDate} onChange={(e) => setTaxDate(e.target.value)} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Comentarios</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} maxLength={254} rows={2} className={inputCls} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Líneas ({lines.length})</span>
              <button
                type="button"
                onClick={() => setLines((p) => [...p, newLine()])}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar línea
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                    <th className="py-2 px-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left min-w-[220px]">Artículo (ItemCode) *</th>
                    <th className="py-2 px-2 text-right w-28">Cantidad *</th>
                    <th className="py-2 px-2 text-right w-32">Precio unit.</th>
                    <th className="py-2 px-2 text-left w-36">Almacén</th>
                    <th className="py-2 px-2 text-left w-28">Impuesto</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <tr key={l.key}>
                      <td className="py-2 px-2 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-2">
                        {l.baseEntry !== undefined ? (
                          <div className="font-mono font-bold text-blue-700">
                            {l.itemCode}
                            <div className="text-[10px] font-normal text-slate-500">
                              {l.description} • OC línea {l.baseLine}
                            </div>
                          </div>
                        ) : (
                          <>
                            <SapLookupInput
                              type="items"
                              value={l.itemCode}
                              placeholder="Código o descripción..."
                              onChange={(code, opt) => updateLine(l.key, { itemCode: code, description: opt?.name })}
                            />
                            {l.description && <div className="text-[10px] text-slate-500 mt-0.5">{l.description}</div>}
                          </>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={l.price ?? ''}
                          placeholder="Lista SAP"
                          onChange={(e) => updateLine(l.key, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <SapLookupInput
                          type="warehouses"
                          value={l.warehouseCode || ''}
                          placeholder="Ej: MP-01"
                          onChange={(code) => updateLine(l.key, { warehouseCode: code })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          value={l.taxCode || ''}
                          placeholder="Ej: IVADC3"
                          onChange={(e) => updateLine(l.key, { taxCode: e.target.value })}
                          className={`${inputCls} font-mono`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Quitar línea"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <WriteFeedback result={result} />
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
          <button
            onClick={() => submit('dry')}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 flex items-center gap-1.5 disabled:opacity-60"
            title="Valida y muestra la petición exacta sin enviarla a SAP"
          >
            <FlaskConical className="h-4 w-4" /> Simular (no envía)
          </button>
          <button
            onClick={() => setConfirm('draft')}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Guardar como borrador
          </button>
          <button
            onClick={() => setConfirm('document')}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Crear en SAP
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        tone={confirm === 'document' ? 'primary' : 'warning'}
        title={confirm === 'document' ? `¿Crear ${label} en SAP?` : `¿Guardar borrador de ${label} en SAP?`}
        message={
          <>
            Proveedor <strong>{cardCode || '—'}</strong> con <strong>{lines.length}</strong> línea(s).{' '}
            {confirm === 'document'
              ? kind === 'goods-receipts'
                ? 'La entrada de mercancía afecta inventario y contabilidad; luego solo se puede cancelar.'
                : 'El documento quedará registrado en SAP Business One.'
              : 'Se guardará en SAP como borrador (ODRF); se puede editar o eliminar después.'}
          </>
        }
        confirmLabel={confirm === 'document' ? 'Sí, crear en SAP' : 'Sí, guardar borrador'}
        isBusy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && submit(confirm)}
      />
    </div>
  );
};
