'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Ship,
  FileSpreadsheet
} from 'lucide-react';
import { DocumentRow } from '@/types/sapBusiness';
import { CreateDocumentModal } from '../modals/CreateDocumentModal';

interface ComprasViewProps {
  subModule: 'compras_entrada' | 'compras_orden' | 'compras_precio_entrega';
  entradas: DocumentRow[];
  ordenes: DocumentRow[];
  preciosEntrega: DocumentRow[];
  onAddDocument: (doc: DocumentRow) => void;
  globalFilter: string;
}

export const ComprasView: React.FC<ComprasViewProps> = ({
  subModule,
  entradas,
  ordenes,
  preciosEntrega,
  onAddDocument,
  globalFilter
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const currentTitle =
    subModule === 'compras_entrada'
      ? 'Compras: Entrada de Mercancías (OPDN)'
      : subModule === 'compras_orden'
      ? 'Compras: Órdenes de Compra (OPOR)'
      : 'Compras: Precios de Entrega / Landed Costs (IPDN)';

  const docTypeToCreate =
    subModule === 'compras_entrada'
      ? 'Entrada Mercancía'
      : subModule === 'compras_orden'
      ? 'Orden de Compra'
      : 'Precio de Entrega';

  const dataList =
    subModule === 'compras_entrada'
      ? entradas
      : subModule === 'compras_orden'
      ? ordenes
      : preciosEntrega;

  const filteredDocs = dataList.filter((d) => {
    const matchesSearch =
      d.docNum.toLowerCase().includes(globalFilter.toLowerCase()) ||
      d.cardName.toLowerCase().includes(globalFilter.toLowerCase()) ||
      d.cardCode.toLowerCase().includes(globalFilter.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-zinc-900">{currentTitle}</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Módulo de Compras
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gestión de abastecimiento, importaciones y prorrateo de costos
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo {docTypeToCreate} (Transaccional)</span>
        </button>
      </div>

      {/* Filter and stats */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="font-semibold text-zinc-700">Estado:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="Abierto">Abiertos</option>
            <option value="Cerrado">Cerrados</option>
            <option value="Pendiente">Pendientes</option>
          </select>
        </div>

        <span className="text-xs text-zinc-500">
          Total: <strong className="text-zinc-800">{filteredDocs.length}</strong> registros
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Doc. SAP</th>
                <th className="py-3 px-4">Proveedor (CardName)</th>
                <th className="py-3 px-4">Código (CardCode)</th>
                <th className="py-3 px-4">Fecha Doc.</th>
                {subModule === 'compras_orden' && <th className="py-3 px-4">Vencimiento</th>}
                <th className="py-3 px-4 text-right">Importe Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4">Detalle / Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{doc.docNum}</td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{doc.cardName}</td>
                  <td className="py-3 px-4 font-mono text-zinc-500">{doc.cardCode}</td>
                  <td className="py-3 px-4 text-zinc-600">{doc.docDate}</td>
                  {subModule === 'compras_orden' && (
                    <td className="py-3 px-4 text-zinc-600">{doc.docDueDate || '—'}</td>
                  )}
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                    {doc.currency} {doc.docTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        doc.status === 'Cerrado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.status === 'Abierto'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 text-[11px] max-w-xs truncate">
                    {doc.comments || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CreateDocumentModal
        docType={docTypeToCreate}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddDocument}
      />
    </div>
  );
};
