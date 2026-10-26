'use client';

import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { InvLineInput } from '@/types/inventory';
import { SapLookupInput } from '../common/SapLookupInput';
import { LineMode, inputCls } from './inventoryMeta';

export interface EditLine {
  key: string;
  itemCode: string;
  description: string;
  quantity: number | '';
  price: number | '';
  warehouseCode: string;
  fromWarehouseCode: string;
  accountCode: string;
  countedQuantity: number | '';
  remarks: string;
  baseEntry?: number;
  baseLine?: number;
  baseLabel?: string;
}

let seq = 0;
export const newLine = (partial: Partial<EditLine> = {}): EditLine => ({
  key: `l${seq++}`,
  itemCode: '',
  description: '',
  quantity: '',
  price: '',
  warehouseCode: '',
  fromWarehouseCode: '',
  accountCode: '',
  countedQuantity: '',
  remarks: '',
  ...partial
});

const toNum = (v: string): number | '' => (v === '' ? '' : Number(v));

/** Convierte las líneas del editor al formato neutro que aceptan las rutas /api/sap/inventory */
export function linesToInput(mode: LineMode, lines: EditLine[]): InvLineInput[] {
  return lines
    .filter((l) => l.itemCode.trim() || l.baseEntry !== undefined)
    .map((l) => {
      const out: InvLineInput = {};
      if (l.itemCode.trim()) out.itemCode = l.itemCode.trim();
      if (l.baseEntry !== undefined && l.baseLine !== undefined) {
        out.baseEntry = l.baseEntry;
        out.baseLine = l.baseLine;
      }
      if (mode === 'gen' || mode === 'transfer') {
        if (l.quantity !== '') out.quantity = Number(l.quantity);
      }
      if (mode === 'gen') {
        if (l.warehouseCode) out.warehouseCode = l.warehouseCode;
        if (l.price !== '') out.price = Number(l.price);
        if (l.accountCode.trim()) out.accountCode = l.accountCode.trim();
      } else if (mode === 'transfer') {
        if (l.fromWarehouseCode) out.fromWarehouseCode = l.fromWarehouseCode;
        if (l.warehouseCode) out.warehouseCode = l.warehouseCode;
      } else {
        if (l.warehouseCode) out.warehouseCode = l.warehouseCode;
        if (l.countedQuantity !== '') out.countedQuantity = Number(l.countedQuantity);
        if (mode === 'posting' && l.price !== '') out.price = Number(l.price);
        if (l.remarks.trim()) out.remarks = l.remarks.trim();
      }
      return out;
    });
}

interface Props {
  mode: LineMode;
  lines: EditLine[];
  onChange: (lines: EditLine[]) => void;
  disabled?: boolean;
  /** Etiqueta del botón para agregar */
  addLabel?: string;
}

/** Editor de líneas nuevas de un documento de inventario (columnas según el tipo de documento) */
export const InventoryLinesEditor: React.FC<Props> = ({ mode, lines, onChange, disabled, addLabel = 'Agregar línea' }) => {
  const update = (key: string, patch: Partial<EditLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[10.5px] uppercase font-bold">
              <th className="p-2 text-left min-w-[200px]">Artículo</th>
              {(mode === 'gen' || mode === 'transfer') && <th className="p-2 text-left w-24">Cantidad</th>}
              {mode === 'transfer' && <th className="p-2 text-left min-w-[120px]">Alm. origen</th>}
              <th className="p-2 text-left min-w-[120px]">{mode === 'transfer' ? 'Alm. destino' : 'Almacén'}</th>
              {(mode === 'counting' || mode === 'posting') && <th className="p-2 text-left w-28">Cant. contada</th>}
              {(mode === 'gen' || mode === 'posting') && <th className="p-2 text-left w-28">{mode === 'gen' ? 'Precio unit.' : 'Precio'}</th>}
              {mode === 'gen' && <th className="p-2 text-left w-32">Cuenta contable</th>}
              {(mode === 'counting' || mode === 'posting') && <th className="p-2 text-left min-w-[120px]">Comentario</th>}
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => (
              <tr key={l.key}>
                <td className="p-1.5">
                  {l.baseLabel ? (
                    <div>
                      <div className="font-mono font-bold">{l.itemCode}</div>
                      <div className="text-[10.5px] text-slate-500 truncate max-w-[260px]">{l.description}</div>
                      <div className="text-[10px] text-indigo-600 font-semibold">{l.baseLabel}</div>
                    </div>
                  ) : (
                    <SapLookupInput
                      type="items"
                      value={l.itemCode}
                      disabled={disabled}
                      onChange={(code, opt) => update(l.key, { itemCode: code, description: opt?.name || l.description })}
                      placeholder="Código o nombre"
                    />
                  )}
                </td>
                {(mode === 'gen' || mode === 'transfer') && (
                  <td className="p-1.5">
                    <input type="number" min={0} step="any" className={inputCls} value={l.quantity} disabled={disabled} onChange={(e) => update(l.key, { quantity: toNum(e.target.value) })} />
                  </td>
                )}
                {mode === 'transfer' && (
                  <td className="p-1.5">
                    <SapLookupInput type="warehouses" value={l.fromWarehouseCode} disabled={disabled} onChange={(c) => update(l.key, { fromWarehouseCode: c })} placeholder="(cabecera)" />
                  </td>
                )}
                <td className="p-1.5">
                  <SapLookupInput
                    type="warehouses"
                    value={l.warehouseCode}
                    disabled={disabled || (mode === 'posting' && l.baseEntry !== undefined)}
                    onChange={(c) => update(l.key, { warehouseCode: c })}
                    placeholder={mode === 'transfer' ? '(cabecera)' : mode === 'gen' ? '(por defecto)' : 'Obligatorio'}
                  />
                </td>
                {(mode === 'counting' || mode === 'posting') && (
                  <td className="p-1.5">
                    <input type="number" min={0} step="any" className={inputCls} value={l.countedQuantity} disabled={disabled} onChange={(e) => update(l.key, { countedQuantity: toNum(e.target.value) })} />
                  </td>
                )}
                {(mode === 'gen' || mode === 'posting') && (
                  <td className="p-1.5">
                    <input type="number" min={0} step="any" className={inputCls} value={l.price} disabled={disabled} placeholder="(SAP)" onChange={(e) => update(l.key, { price: toNum(e.target.value) })} />
                  </td>
                )}
                {mode === 'gen' && (
                  <td className="p-1.5">
                    <input type="text" maxLength={15} className={inputCls} value={l.accountCode} disabled={disabled} placeholder="(por defecto)" onChange={(e) => update(l.key, { accountCode: e.target.value })} />
                  </td>
                )}
                {(mode === 'counting' || mode === 'posting') && (
                  <td className="p-1.5">
                    <input type="text" maxLength={254} className={inputCls} value={l.remarks} disabled={disabled} onChange={(e) => update(l.key, { remarks: e.target.value })} />
                  </td>
                )}
                <td className="p-1.5 text-center">
                  <button type="button" disabled={disabled} onClick={() => remove(l.key)} className="p-1 rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-40" title="Quitar línea">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-slate-500">
                  Sin líneas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...lines, newLine()])}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
};
