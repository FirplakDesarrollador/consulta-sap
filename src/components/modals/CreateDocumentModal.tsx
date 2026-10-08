'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Save, FileText } from 'lucide-react';
import { DocumentRow } from '@/types/sapBusiness';

interface CreateDocumentModalProps {
  docType: 'Factura' | 'Pedido' | 'Entrada Mercancía' | 'Orden de Compra' | 'Precio de Entrega';
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: DocumentRow) => void;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  docType,
  isOpen,
  onClose,
  onSave
}) => {
  const [cardCode, setCardCode] = useState('');
  const [cardName, setCardName] = useState('');
  const [docDate, setDocDate] = useState('2026-04-08');
  const [docDueDate, setDocDueDate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [comments, setComments] = useState('');
  const [items, setItems] = useState([
    { itemCode: 'PT-VALV-01', description: 'Válvula de Control 2"', quantity: 1, price: 850000, whsCode: '01' }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { itemCode: '', description: '', quantity: 1, price: 0, whsCode: '01' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price) || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = docType === 'Factura' ? 'FV' : docType === 'Pedido' ? 'PV' : docType === 'Entrada Mercancía' ? 'EM' : docType === 'Orden de Compra' ? 'OC' : 'PE';
    const randNum = Math.floor(Math.random() * 900000 + 100000);
    const newDoc: DocumentRow = {
      id: `${prefix}-${randNum}`,
      docNum: `${prefix}-${randNum}`,
      docType,
      cardCode: cardCode || 'C900123456',
      cardName: cardName || 'Cliente / Proveedor Directo',
      docDate,
      docDueDate,
      docTotal: calculateTotal(),
      currency,
      status: 'Abierto',
      comments,
      itemsCount: items.length,
      items: items.map((i) => ({
        ...i,
        total: Number(i.quantity) * Number(i.price)
      }))
    };

    onSave(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">
                Creación Transaccional: Nuevo {docType}
              </h3>
              <p className="text-xs text-zinc-500">
                Registro directo en el sistema SAP (Transaccional)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Código Socio (CardCode)
              </label>
              <input
                type="text"
                required
                placeholder="Ej: C900123456"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nombre / Razón Social
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del Cliente o Proveedor"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="COP">COP ($ Pesos)</option>
                <option value="USD">USD ($ Dólares)</option>
                <option value="EUR">EUR (€ Euros)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fecha Contabilización
              </label>
              <input
                type="date"
                required
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={docDueDate}
                onChange={(e) => setDocDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Comentarios / Observaciones
              </label>
              <input
                type="text"
                placeholder="Observaciones de documento..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Items lines table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Líneas de Artículos / Posiciones
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Línea
              </button>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2">Cód. Artículo</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 w-20 text-right">Cant.</th>
                    <th className="p-2 w-28 text-right">Precio Unit.</th>
                    <th className="p-2 w-28 text-right">Total</th>
                    <th className="p-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="PT-..."
                          value={item.itemCode}
                          onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                          className="w-full px-2 py-1 border border-zinc-300 rounded text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="Descripción del ítem"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-zinc-300 rounded text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-zinc-300 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-zinc-300 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-zinc-900">
                        {(Number(item.quantity) * Number(item.price)).toLocaleString('es-ES')}
                      </td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end pt-3">
              <div className="text-right">
                <span className="text-xs text-zinc-500">Total Documento: </span>
                <span className="text-base font-mono font-bold text-zinc-900">
                  {currency} {calculateTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow transition"
            >
              <Save className="h-4 w-4" />
              <span>Contabilizar en SAP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
