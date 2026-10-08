'use client';

import React, { useState } from 'react';
import {
  Database,
  Code,
  Download,
  Copy,
  Check,
  TrendingUp,
  Boxes,
  FileCheck2,
  PieChart,
  DollarSign
} from 'lucide-react';
import {
  mockQueryCostoProductoTerminado,
  mockQueryFacturasClienteFinal,
  mockQuerySalidasConcepto
} from '@/data/mockBusinessData';

interface QueriesViewProps {
  subModule: 'query_costo_pt' | 'query_facturas_cliente' | 'query_salidas_concepto';
  globalFilter: string;
}

export const QueriesView: React.FC<QueriesViewProps> = ({ subModule, globalFilter }) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  // SQL definitions
  const sqlQueries = {
    query_costo_pt: `SELECT 
    T0.ItemCode AS [CodigoPT],
    T0.ItemName AS [DescripcionPT],
    T1.OcrCode AS [CentroCosto],
    SUM(T2.LineTotal) AS [CostoMateriaPrima],
    T0.AvgPrice AS [CostoTotalUnitario],
    T3.Price AS [PrecioVentaSugerido]
FROM OITM T0
INNER JOIN WOR1 T2 ON T0.ItemCode = T2.ItemCode
INNER JOIN OWOR T1 ON T2.DocEntry = T1.DocEntry
LEFT JOIN ITM1 T3 ON T0.ItemCode = T3.ItemCode AND T3.PriceList = 1
WHERE T0.ItmsGrpCod = 101 -- Producto Terminado
GROUP BY T0.ItemCode, T0.ItemName, T1.OcrCode, T0.AvgPrice, T3.Price;`,

    query_facturas_cliente: `SELECT 
    T0.DocNum AS [NumFactura],
    T0.DocDate AS [FechaEmision],
    T0.LicTradNum AS [NITCliente],
    T0.CardName AS [NombreCliente],
    T1.SlpName AS [Vendedor],
    T0.DocTotal - T0.VatSum AS [Subtotal],
    T0.VatSum AS [IVA19],
    T0.DocTotal AS [TotalFactura],
    T0.DocCur AS [Moneda]
FROM OINV T0
LEFT JOIN OSLP T1 ON T0.SlpCode = T1.SlpCode
WHERE T0.CANCELED = 'N'
ORDER BY T0.DocDate DESC;`,

    query_salidas_concepto: `SELECT 
    T0.Comments AS [Concepto],
    T1.AcctCode AS [CuentaContable],
    COUNT(T0.DocEntry) AS [CantidadMovimientos],
    SUM(T1.Quantity) AS [TotalCantidad],
    SUM(T1.LineTotal) AS [CostoTotalCOP]
FROM OIGE T0
INNER JOIN IGE1 T1 ON T0.DocEntry = T1.DocEntry
GROUP BY T0.Comments, T1.AcctCode
ORDER BY SUM(T1.LineTotal) DESC;`
  };

  const title =
    subModule === 'query_costo_pt'
      ? 'Costo de Producto Terminado'
      : subModule === 'query_facturas_cliente'
      ? 'Facturas Cliente Final'
      : 'Salidas por Concepto Consolidado';

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQueries[subModule]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    let headers = '';
    let rows: string[] = [];

    if (subModule === 'query_costo_pt') {
      headers = 'CodigoPT,DescripcionPT,CentroCosto,CostoMP,CostoMO,CostoCIF,CostoTotalUnitario,PrecioVenta,Margen,Lote\n';
      rows = mockQueryCostoProductoTerminado.map(
        (r) =>
          `"${r.codigoPT}","${r.descripcionPT}","${r.centroCosto}",${r.costoMateriaPrima},${r.costoManoObra},${r.costosIndirectosCIF},${r.costoTotalUnitario},${r.precioVentaSugerido},"${r.margenBrutoPct}","${r.ultimoLoteCerrado}"`
      );
    } else if (subModule === 'query_facturas_cliente') {
      headers = 'NumFactura,FechaEmision,NIT,Cliente,Vendedor,Subtotal,IVA,Total,Moneda,EstadoDIAN,Ciudad\n';
      rows = mockQueryFacturasClienteFinal.map(
        (r) =>
          `"${r.numFactura}","${r.fechaEmision}","${r.nitCliente}","${r.nombreCliente}","${r.vendedor}",${r.subtotal},${r.iva19},${r.totalFactura},"${r.moneda}","${r.estadoDIAN}","${r.ciudad}"`
      );
    } else {
      headers = 'Concepto,CuentaContable,CantidadMovimientos,TotalCantidad,Unidad,CostoTotalCOP,Participacion\n';
      rows = mockQuerySalidasConcepto.map(
        (r) =>
          `"${r.concepto}","${r.cuentaContable}",${r.cantidadMovimientos},${r.totalCantidad},"${r.unidad}",${r.costoTotalCOP},"${r.porcentajeParticipacion}"`
      );
    }

    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${subModule}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Action Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-sm">
              <Database className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Query SAP: {title}
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Query SQL / Analítica
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Consulta optimizada con agregaciones, costos estándar/reales y cálculos automáticos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSql(!showSql)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
              showSql
                ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/10'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>{showSql ? 'Ocultar SQL' : 'Ver SQL Query'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-102 active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* SQL Box if toggled */}
      {showSql && (
        <div className="p-5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 shadow-xl relative animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              -- Script SQL para SAP HANA / Microsoft SQL Server:
            </span>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar SQL'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto leading-relaxed">{sqlQueries[subModule]}</pre>
        </div>
      )}

      {/* ================= 1. Costo de Producto Terminado ================= */}
      {subModule === 'query_costo_pt' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 whitespace-nowrap">Código PT</th>
                  <th className="py-3.5 px-4">Descripción Producto</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Centro Costo</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo MP</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo MO</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo CIF</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo Total Unit.</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Precio Venta</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Margen Bruto</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Último Lote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {mockQueryCostoProductoTerminado.map((r, idx) => (
                  <tr
                    key={r.codigoPT}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-4 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {r.codigoPT}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 max-w-xs">
                      {r.descripcionPT}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {r.centroCosto}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      ${r.costoMateriaPrima.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      ${r.costoManoObra.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      ${r.costosIndirectosCIF.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap bg-slate-100/40">
                      ${r.costoTotalUnitario.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                      ${r.precioVentaSugerido.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.margenBrutoPct}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {r.ultimoLoteCerrado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 2. Facturas Cliente Final ================= */}
      {subModule === 'query_facturas_cliente' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4 whitespace-nowrap">N° Factura</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fecha Emisión</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">NIT / Cédula</th>
                  <th className="py-3.5 px-4">Nombre Cliente Final</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Vendedor</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Subtotal</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">IVA 19%</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Factura</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Forma de Pago</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Estado DIAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {mockQueryFacturasClienteFinal.map((r, idx) => (
                  <tr
                    key={r.numFactura}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-4 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {r.numFactura}
                    </td>
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap">{r.fechaEmision}</td>
                    <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">{r.nitCliente}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900">{r.nombreCliente}</td>
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap">{r.vendedor}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {r.moneda} {r.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {r.moneda} {r.iva19.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap bg-slate-100/40">
                      {r.moneda} {r.totalFactura.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px] whitespace-nowrap">{r.formaPago}</td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.estadoDIAN}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 3. Salidas por Concepto Consolidado ================= */}
      {subModule === 'query_salidas_concepto' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4">Concepto de Salida</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Cuenta Contable (P&L)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Cant. Movimientos</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Unidades Totales</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Costo Consolidado (COP)</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">% Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {mockQuerySalidasConcepto.map((r, idx) => (
                  <tr
                    key={r.concepto}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-4 px-4 font-semibold text-slate-900">{r.concepto}</td>
                    <td className="py-4 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {r.cuentaContable}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {r.cantidadMovimientos}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.totalCantidad} {r.unidad}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-950 whitespace-nowrap bg-slate-100/40">
                      ${r.costoTotalCOP.toLocaleString('es-ES')}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {r.porcentajeParticipacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
