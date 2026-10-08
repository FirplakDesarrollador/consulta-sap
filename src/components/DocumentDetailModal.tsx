'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  GitMerge,
  ListTree,
  Building2,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCode2,
  Printer,
  Download,
  Share2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { SAPDocument } from '../types/sap';

interface DocumentDetailModalProps {
  document: SAPDocument | null;
  onClose: () => void;
  onSelectRelatedDoc?: (docNumber: string) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onSelectRelatedDoc
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'flow' | 'header' | 'raw'>('items');

  if (!document) return null;

  const getStatusBadge = (status: SAPDocument['status']) => {
    switch (status) {
      case 'Liberado':
      case 'Contabilizado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {status}
          </span>
        );
      case 'En Tránsito':
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5" />
            {status}
          </span>
        );
      case 'Bloqueado':
      case 'Anulado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3.5 w-3.5" />
            {status}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xl font-bold text-white tracking-wide">
                Doc SAP: #{document.docNumber}
              </span>
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                T-Code: {document.tcode}
              </span>
              {getStatusBadge(document.status)}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="font-medium text-slate-300">{document.typeName}</span>
              <span>•</span>
              <span>Sociedad {document.companyCode}</span>
              <span>•</span>
              <span>Centro {document.plant}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="Imprimir vista SAP"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/90 flex gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'items'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTree className="h-4 w-4" />
            Posiciones / Materiales ({document.items.length})
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'flow'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitMerge className="h-4 w-4" />
            Flujo de Documentos ({document.flow.length})
          </button>
          <button
            onClick={() => setActiveTab('header')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'header'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Cabecera & Socios
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            Estructura SAP BAPI / JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Neto</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {document.currency} {document.netTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Impuestos / IVA</span>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {document.currency} {document.taxTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Bruto</span>
              <div className="text-lg font-bold text-blue-400 mt-0.5">
                {document.currency} {document.grossTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">Fecha de Registro</span>
              <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {document.docDate}
              </div>
            </div>
          </div>

          {/* TAB 1: Items Table */}
          {activeTab === 'items' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Pos</th>
                    <th className="py-2.5 px-3">Material / Código</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-right">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-3 text-right">Valor Neto</th>
                    <th className="py-2.5 px-3 text-center">Centro/Alm</th>
                    <th className="py-2.5 px-3 text-center">Lote</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {document.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-400">{item.pos}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{item.material}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{item.description}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {item.quantity} <span className="text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.currency} {item.netPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-white">
                        {item.currency} {item.netValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-sans">
                        {item.plant} / {item.storageLoc}
                      </td>
                      <td className="py-2.5 px-3 text-center text-amber-400/90">
                        {item.batch || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Document Flow (Visual Timeline) */}
          {activeTab === 'flow' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                Cadena de documentos vinculados (VBFA / BKPF) en SAP S/4HANA:
              </div>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                {document.flow.map((step, idx) => (
                  <div key={step.id} className="relative flex items-start gap-4">
                    {/* Step Icon Indicator */}
                    <div
                      className={`absolute -left-6 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        step.status === 'Completado'
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : step.status === 'Error'
                          ? 'bg-rose-600 border-rose-400 text-white'
                          : 'bg-amber-600 border-amber-400 text-white'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{step.docType}</span>
                          <span className="font-mono text-xs text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            #{step.docNumber}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {step.date} {step.time ? `• ${step.time}` : ''}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1">{step.description}</p>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>Creado por: <strong className="text-slate-300">{step.user}</strong></span>
                        {step.amount && (
                          <span className="font-mono font-semibold text-slate-200">
                            {step.currency} {step.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Header and Partners */}
          {activeTab === 'header' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Partner info */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Interlocutor Comercial / Partner
                </h4>
                {document.customer && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-sm font-bold text-white">{document.customer.name}</div>
                    <div className="text-slate-400">ID Deudor SAP: <span className="font-mono text-slate-200">{document.customer.id}</span></div>
                    <div className="text-slate-400">Identificación Fiscal: <span className="text-slate-200">{document.customer.taxId}</span></div>
                    <div className="text-slate-400">Ubicación: <span className="text-slate-200">{document.customer.city}, {document.customer.country}</span></div>
                  </div>
                )}
                {document.vendor && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-sm font-bold text-white">{document.vendor.name}</div>
                    <div className="text-slate-400">ID Acreedor SAP: <span className="font-mono text-slate-200">{document.vendor.id}</span></div>
                    <div className="text-slate-400">Identificación Fiscal: <span className="text-slate-200">{document.vendor.taxId}</span></div>
                    <div className="text-slate-400">Ubicación: <span className="text-slate-200">{document.vendor.city}, {document.vendor.country}</span></div>
                  </div>
                )}
              </div>

              {/* Commercial & Logistics terms */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Datos Organizacionales y Pago
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Condición de Pago (ZTERM): </span>
                    <span className="font-semibold text-slate-200">{document.paymentTerms}</span>
                  </div>
                  {document.incoterms && (
                    <div>
                      <span className="text-slate-400">Incoterms: </span>
                      <span className="font-semibold text-slate-200">{document.incoterms}</span>
                    </div>
                  )}
                  {document.salesOrg && (
                    <div>
                      <span className="text-slate-400">Org. de Ventas: </span>
                      <span className="font-semibold text-slate-200">{document.salesOrg}</span>
                    </div>
                  )}
                  {document.purchasingOrg && (
                    <div>
                      <span className="text-slate-400">Org. de Compras: </span>
                      <span className="font-semibold text-slate-200">{document.purchasingOrg}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Usuario SAP creador: </span>
                    <span className="font-mono text-blue-400">{document.createdBy}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {document.notes && (
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Textos y Observaciones de Cabecera (STXH / STXL)
                  </h4>
                  <p className="text-xs text-amber-200/90 font-mono bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/30">
                    {document.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Raw JSON Structure */}
          {activeTab === 'raw' && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80">
              <pre>{JSON.stringify(document, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Registro extraído mediante BAPI_SALESORDER_GETLIST / RFC_READ_TABLE
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
          >
            Cerrar Consulta
          </button>
        </div>
      </div>
    </div>
  );
};
