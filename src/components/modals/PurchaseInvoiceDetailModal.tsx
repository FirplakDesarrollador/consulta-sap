'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Printer,
  Download,
  RefreshCw,
  AlertCircle,
  FileCode2,
  User,
  Receipt,
  Tag
} from 'lucide-react';

export interface PurchaseInvoiceLineItem {
  lineNum: number;
  itemCode: string;
  description: string;
  quantity: number;
  price: number;
  priceAfterVAT: number;
  discountPercent: number;
  lineTotal: number;
  grossTotal: number;
  whsCode: string;
  taxCode: string;
  taxTotal: number;
  unitMsr: string;
  baseType?: number;
  baseEntry?: number;
}

export interface PurchaseInvoiceDetailData {
  docEntry: number;
  docNum: string;
  numAtCard: string;
  cardCode: string;
  cardName: string;
  taxId: string;
  address: string;
  docDate: string;
  docDueDate: string;
  taxDate: string;
  currency: string;
  docTotal: number;
  vatSum: number;
  subtotal: number;
  discountPercent: number;
  discountSum: number;
  status: string;
  comments: string;
  controlAccount: string;
  paymentGroup: string;
  lines: PurchaseInvoiceLineItem[];
  raw: unknown;
}

interface PurchaseInvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
}

export const PurchaseInvoiceDetailModal: React.FC<PurchaseInvoiceDetailModalProps> = ({
  invoiceId,
  onClose
}) => {
  const [detail, setDetail] = useState<PurchaseInvoiceDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lines' | 'header' | 'raw'>('lines');

  useEffect(() => {
    if (!invoiceId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cleanId = invoiceId.replace(/^(PUR-INV-|INV-)/, '');
        const res = await fetch(`/api/sap/purchase-invoices/${cleanId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data);
        } else {
          setError(json.error || 'No se pudo cargar el detalle de la factura de proveedor');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al conectar con SAP');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [invoiceId]);

  if (!invoiceId) return null;

  const handleExportCSV = () => {
    if (!detail) return;
    const headers = 'NumLinea,CodigoArticulo,Descripcion,Cantidad,Unidad,PrecioUnitario,Descuento,TotalLinea,Almacen,CodImpuesto\n';
    const rows = (detail.lines || []).map(
      (l: PurchaseInvoiceLineItem) =>
        `${l.lineNum},"${l.itemCode}","${(l.description || '').replace(/"/g, '""')}",${l.quantity},"${l.unitMsr}",${l.price},${l.discountPercent},${l.lineTotal},"${l.whsCode}","${l.taxCode}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FacturaProveedor_${detail.docNum}_Detalle.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                    Factura Proveedor SAP #{detail?.docNum || invoiceId}
                  </h3>
                  {detail && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        detail.status === 'Cerrado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {detail.status}
                    </span>
                  )}
                  {detail?.numAtCard && detail.numAtCard !== '—' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                      No. Proveedor: {detail.numAtCard}
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono">
                    DocEntry: {detail?.docEntry || '...'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  {detail?.cardName || 'Consultando proveedor...'} {detail?.cardCode && `[${detail.cardCode}]`} {detail?.taxId && `• NIT: ${detail.taxId}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <>
                <button
                  onClick={handleExportCSV}
                  title="Exportar posiciones a CSV"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.print()}
                  title="Imprimir factura"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-300 transition shadow-2xs"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('lines')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'lines'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Líneas de Artículos / Servicios ({detail?.lines?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('header')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'header'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Datos de Facturación & Proveedor</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'raw'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            <span>Respuesta JSON Service Layer</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
              <div className="text-sm font-bold text-slate-800">
                Obteniendo detalle completo de la factura de proveedor desde SAP Business One...
              </div>
              <div className="text-xs text-slate-500">
                Consultando posiciones, cuentas de control, retenciones e impuestos
              </div>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
              <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">Error al consultar el detalle:</div>
                <div className="mt-1 font-mono">{error}</div>
              </div>
            </div>
          ) : detail ? (
            <>
              {activeTab === 'lines' && (
                <div className="space-y-4">
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500">Subtotal Antes Impuestos</span>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                        {detail.currency} {detail.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500">Descuento Global</span>
                      <div className="text-base font-extrabold text-amber-700 font-mono mt-0.5">
                        {detail.currency} {detail.discountSum.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        {detail.discountPercent > 0 && ` (${detail.discountPercent}%)`}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500">Impuestos / IVA (VatSum)</span>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                        {detail.currency} {detail.vatSum.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
                      <span className="text-[11px] font-bold text-emerald-800">Total Factura (DocTotal)</span>
                      <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                        {detail.currency} {detail.docTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Lines Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3">Código Artículo</th>
                            <th className="py-2.5 px-3">Descripción</th>
                            <th className="py-2.5 px-3 text-right">Cantidad</th>
                            <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                            <th className="py-2.5 px-3 text-center">Desc %</th>
                            <th className="py-2.5 px-3 text-center">Almacén</th>
                            <th className="py-2.5 px-3 text-center">Impuesto</th>
                            <th className="py-2.5 px-3 text-right">Total Línea</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {detail.lines.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No se encontraron líneas detalladas en este documento.
                              </td>
                            </tr>
                          ) : (
                            detail.lines.map((l) => (
                              <tr key={l.lineNum} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                                  {l.lineNum + 1}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                  {l.itemCode || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate" title={l.description}>
                                  {l.description || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                  {l.quantity} <span className="text-[10px] text-slate-500 font-sans">{l.unitMsr}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {detail.currency} {l.price.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                  {l.discountPercent > 0 ? `${l.discountPercent}%` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-600 font-bold">
                                  {l.whsCode || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                                  {l.taxCode || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                                  {detail.currency} {l.lineTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'header' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card: Proveedor */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span>Interlocutor Comercial / Proveedor</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Código Proveedor:</span>
                        <span className="font-mono font-bold text-slate-800">{detail.cardCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">NIT / Tax ID:</span>
                        <span className="font-mono font-bold text-slate-800">{detail.taxId}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block text-[11px]">Razón Social:</span>
                        <span className="font-bold text-slate-900">{detail.cardName}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block text-[11px]">Dirección Fiscal:</span>
                        <span className="text-slate-700 font-medium">{detail.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Fechas & Referencia */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span>Fechas y Referencia de Factura</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">No. Factura Proveedor:</span>
                        <span className="font-mono font-extrabold text-amber-800">{detail.numAtCard}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Estado Documento:</span>
                        <span className="font-semibold text-slate-800">{detail.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Fecha Contabilización:</span>
                        <span className="font-mono text-slate-800 font-medium">{detail.docDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Fecha Vencimiento:</span>
                        <span className="font-mono text-slate-800 font-medium">{detail.docDueDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Fecha Documento / Fiscal:</span>
                        <span className="font-mono text-slate-800 font-medium">{detail.taxDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Moneda:</span>
                        <span className="font-mono font-bold text-slate-800">{detail.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Parámetros Financieros */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span>Parámetros Contables & Pagos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Cuenta Control:</span>
                        <span className="font-mono text-slate-800 font-bold">{detail.controlAccount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Condición de Pago:</span>
                        <span className="font-mono text-slate-800">{detail.paymentGroup}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Comentarios */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <span>Comentarios & Observaciones SAP</span>
                    </div>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono whitespace-pre-wrap">
                      {detail.comments || 'Sin comentarios registrados.'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Estructura OData recibida desde SAP Service Layer:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(detail.raw, null, 2))}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 font-bold text-slate-700 transition"
                    >
                      Copiar JSON
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[450px]">
                    {JSON.stringify(detail.raw, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

