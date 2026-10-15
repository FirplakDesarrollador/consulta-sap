'use client';

import React, { useState } from 'react';
import { X, Tag, DollarSign, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ItemPriceRow, SapPriceList } from '@/types/sapBusiness';

interface EditPriceModalProps {
  item: ItemPriceRow | null;
  priceList: SapPriceList | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPrice: number) => void;
}

export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  item,
  priceList,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [newPrice, setNewPrice] = useState<string>(item ? String(item.price) : '0');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (item) {
      setNewPrice(String(item.price || 0));
      setError(null);
      setSuccessMsg(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item || !priceList) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(newPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Por favor ingresa un precio válido mayor o igual a 0');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/sap/price-lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: item.itemCode,
          priceListNo: priceList.priceListNo,
          price: numPrice,
          currency: item.currency || priceList.currency || 'COP'
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al actualizar el precio en SAP Service Layer');
      }

      setSuccessMsg(json.message || 'Precio actualizado correctamente en SAP');
      setTimeout(() => {
        onSuccess(numPrice);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error de comunicación con SAP');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Actualizar Precio en SAP</h3>
              <p className="text-xs text-slate-500 font-medium">
                {priceList.priceListName} (Nº {priceList.priceListNo})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Artículo SAP</span>
              <span className="text-xs font-mono font-bold text-purple-700">{item.itemCode}</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 line-clamp-2">
              {item.itemName}
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
              <span>Unidad: <strong className="text-slate-700">{item.uom || 'UND'}</strong></span>
              <span>Moneda: <strong className="text-slate-700">{item.currency}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nuevo Precio ({item.currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm font-mono font-bold px-3 py-2 pl-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition text-slate-900"
              />
              <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Precio actual en SAP: {item.currency} {Number(item.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-2.5 bg-purple-50/70 border border-purple-200/60 rounded-xl text-[11px] text-purple-900 flex items-center justify-between">
            <span className="font-medium">⚡ Sincronización OData SAP B1</span>
            <span className="font-mono text-[10px] bg-purple-200/70 px-1.5 py-0.5 rounded font-bold">
              PATCH /Items
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Precio</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
