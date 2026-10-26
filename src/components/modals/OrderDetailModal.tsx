'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardList,
  Building2,
  Calendar,
  Package,
  Printer,
  Download,
  RefreshCw,
  AlertCircle,
  FileCode2,
  User,
  Truck
} from 'lucide-react';

interface OrderLine {
  lineNum: number;
  itemCode: string;
  description: string;
  quantity: number;
  openQuantity: number;
  deliveredQuantity: number;
  price: number;
  discountPercent: number;
  lineTotal: number;
  openAmount: number;
  whsCode: string;
  taxCode: string;
  unitMsr: string;
  lineStatus: 'Abierta' | 'Cerrada';
  shipDate: string;
}

interface OrderDetail {
  docEntry: number;
  docNum: string;
  cardCode: string;
  cardName: string;
  numAtCard: string;
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
  status: 'Abierto' | 'Cerrado' | 'Cancelado';
  cancelled: boolean;
  comments: string;
  salesPersonCode: number | null;
  salesPersonName: string;
  paymentGroup: number | string;
  totalQuantity: number;
  totalOpenQuantity: number;
  openLinesCount: number;
  lines: OrderLine[];
  raw: unknown;
}

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

const money = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2 });
const qty = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });

const statusBadgeClass = (status: string) => {
  if (status === 'Cerrado') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'Cancelado') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
};

/**
 * Detalle de solo lectura de un Pedido de Cliente (ORDR / RDR1).
 */
export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose }) => {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lines' | 'header' | 'raw'>('lines');

  useEffect(() => {
    if (!orderId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cleanId = orderId.replace(/^ORD-/, '');
        const res = await fetch(`/api/sap/orders/${encodeURIComponent(cleanId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data);
        } else {
          setError(json.error || 'No se pudo cargar el detalle del pedido');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al conectar con SAP');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [orderId]);

  if (!orderId) return null;

  const handleExportCSV = () => {
    if (!detail) return;
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const headers =
      'NumLinea,CodigoArticulo,Descripcion,Cantidad,CantidadPendiente,CantidadEntregada,Unidad,PrecioUnitario,Descuento,TotalLinea,Almacen,EstadoLinea,FechaEntrega\n';
    const rows = detail.lines.map(
      (l) =>
        `${l.lineNum},${esc(l.itemCode)},${esc(l.description)},${l.quantity},${l.openQuantity},${l.deliveredQuantity},${esc(l.unitMsr)},${l.price},${l.discountPercent},${l.lineTotal},${esc(l.whsCode)},${esc(l.lineStatus)},${esc(l.shipDate)}`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pedido_${detail.docNum}_Detalle.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabClass = (tab: 'lines' | 'header' | 'raw') =>
    `py-3 border-b-2 flex items-center gap-2 transition-colors ${
      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                  Pedido SAP #{detail?.docNum || orderId.replace(/^ORD-/, '')}
                </h3>
                {detail && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadgeClass(detail.status)}`}>
                    {detail.status}
                  </span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono">
                  DocEntry: {detail?.docEntry || '...'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {detail?.cardName || 'Consultando cliente...'} {detail?.cardCode && `• ${detail.cardCode}`}
                {detail?.numAtCard && ` • Ref. cliente: ${detail.numAtCard}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <>
                <button
                  onClick={handleExportCSV}
                  title="Exportar líneas a CSV"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.print()}
                  title="Imprimir pedido"
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

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold">
          <button onClick={() => setActiveTab('lines')} className={tabClass('lines')}>
            <Package className="h-4 w-4" />
            <span>Líneas del Pedido ({detail?.lines?.length || 0})</span>
          </button>
          <button onClick={() => setActiveTab('header')} className={tabClass('header')}>
            <Building2 className="h-4 w-4" />
            <span>Datos del Pedido & Cliente</span>
          </button>
          <button onClick={() => setActiveTab('raw')} className={tabClass('raw')}>
            <FileCode2 className="h-4 w-4" />
            <span>Respuesta JSON Service Layer</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-sm font-bold text-slate-800">
                Obteniendo detalle completo del pedido desde SAP Business One...
              </div>
              <div className="text-xs text-slate-500">
                Consultando líneas, cantidades pendientes y fechas de entrega
              </div>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
              <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">Error al consultar el detalle:</div>
                <div className="mt-0.5 break-all">{error}</div>
              </div>
            </div>
          ) : detail ? (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Subtotal Neto</span>
                  <div className="text-lg font-mono font-extrabold text-slate-900 mt-1">
                    {detail.currency} {money(detail.subtotal)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Impuestos (IVA)</span>
                  <div className="text-lg font-mono font-extrabold text-slate-800 mt-1">
                    {detail.currency} {money(detail.vatSum)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-700 uppercase">Cantidad Pendiente</span>
                  <div className="text-lg font-mono font-extrabold text-amber-800 mt-1">
                    {qty(detail.totalOpenQuantity)} / {qty(detail.totalQuantity)}
                  </div>
                  <div className="text-[10.5px] text-amber-700 font-semibold">
                    {detail.openLinesCount} de {detail.lines.length} líneas abiertas
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">Total Pedido</span>
                  <div className="text-lg font-mono font-extrabold text-blue-900 mt-1">
                    {detail.currency} {money(detail.docTotal)}
                  </div>
                </div>
              </div>

              {/* TAB 1: Lines */}
              {activeTab === 'lines' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Líneas del pedido (RDR1 • {detail.lines.length} artículos)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Base de datos: <strong>Firplak_SA</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3 text-center">#</th>
                          <th className="py-3 px-3 whitespace-nowrap">Código Artículo</th>
                          <th className="py-3 px-3">Descripción</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Cantidad</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Pendiente</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Precio Unit.</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">% Dcto</th>
                          <th className="py-3 px-3 text-right whitespace-nowrap">Total Línea</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Almacén</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Fecha Entrega</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {detail.lines.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-slate-500">
                              Este pedido no contiene líneas de artículos.
                            </td>
                          </tr>
                        ) : (
                          detail.lines.map((line, idx) => (
                            <tr
                              key={`${line.lineNum}-${idx}`}
                              className={`hover:bg-blue-50/30 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                            >
                              <td className="py-3 px-3 font-mono text-center text-slate-400 text-[11px]">{idx + 1}</td>
                              <td className="py-3 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                                {line.itemCode || '—'}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs">
                                {line.description || 'Sin descripción'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {qty(line.quantity)} <span className="text-[10px] font-normal text-slate-500">{line.unitMsr}</span>
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-mono font-extrabold whitespace-nowrap ${
                                  line.openQuantity > 0 ? 'text-amber-700 bg-amber-50/50' : 'text-slate-400'
                                }`}
                                title={`Entregado: ${qty(line.deliveredQuantity)}`}
                              >
                                {qty(line.openQuantity)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                                ${money(line.price)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                                {line.discountPercent > 0 ? `${line.discountPercent}%` : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap bg-slate-100/30">
                                ${money(line.lineTotal)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {line.whsCode || '—'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {line.shipDate || '—'}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    line.lineStatus === 'Cerrada'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {line.lineStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Header */}
              {activeTab === 'header' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Datos del Cliente (OCRD)</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">Nombre / Razón Social: </span>
                        <span className="font-bold text-slate-900">{detail.cardName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Código Socio (CardCode): </span>
                        <span className="font-mono font-bold text-blue-600">{detail.cardCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">NIT / Identificación Fiscal: </span>
                        <span className="font-mono font-bold text-slate-800">{detail.taxId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Referencia del Cliente (NumAtCard): </span>
                        <span className="font-mono font-bold text-slate-800">{detail.numAtCard || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Dirección de Entrega: </span>
                        <span className="text-slate-800">{detail.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Fechas y Gestión Comercial</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">Fecha del Pedido (DocDate): </span>
                        <span className="font-mono font-bold text-slate-800">{detail.docDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Fecha de Entrega (DocDueDate): </span>
                        <span className="font-mono font-bold text-slate-800">{detail.docDueDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Fecha del Documento (TaxDate): </span>
                        <span className="font-mono text-slate-700">{detail.taxDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Empleado de Ventas: </span>
                        <span className="font-semibold text-slate-800">
                          {detail.salesPersonName || '—'}
                          {detail.salesPersonCode !== null && (
                            <span className="font-mono text-slate-500"> (Cód. {detail.salesPersonCode})</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Condición de Pago / Grupo: </span>
                        <span className="font-semibold text-slate-800">{String(detail.paymentGroup)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Descuento del Documento: </span>
                        <span className="font-mono text-slate-800">
                          {detail.discountPercent > 0
                            ? `${detail.discountPercent}%`
                            : `${detail.currency} ${money(detail.discountSum)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span>Comentarios del Pedido</span>
                    </h4>
                    <p className="text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {detail.comments || 'Sin comentarios.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: Raw JSON */}
              {activeTab === 'raw' && (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96 shadow-inner">
                  <pre>{JSON.stringify(detail.raw, null, 2)}</pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Service Layer v1 • Pedido de solo consulta extraído de Firplak_SA
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
