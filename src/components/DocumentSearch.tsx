'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { SAPDocument, SAPDocType } from '../types/sap';

interface DocumentSearchProps {
  documents: SAPDocument[];
  onSelectDocument: (doc: SAPDocument) => void;
  globalSearch: string;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  documents,
  onSelectDocument,
  globalSearch
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof SAPDocument>('docDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Global search
      if (globalSearch.trim()) {
        const query = globalSearch.toLowerCase();
        const matchesDoc = doc.docNumber.toLowerCase().includes(query);
        const matchesCustomer = doc.customer?.name.toLowerCase().includes(query);
        const matchesVendor = doc.vendor?.name.toLowerCase().includes(query);
        const matchesTcode = doc.tcode.toLowerCase().includes(query);
        const matchesType = doc.typeName.toLowerCase().includes(query);
        const matchesItems = doc.items.some(
          (i) =>
            i.material.toLowerCase().includes(query) ||
            i.description.toLowerCase().includes(query)
        );

        if (!matchesDoc && !matchesCustomer && !matchesVendor && !matchesTcode && !matchesType && !matchesItems) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'ALL' && doc.type !== selectedType) {
        return false;
      }

      // Company filter
      if (selectedCompany !== 'ALL' && doc.companyCode !== selectedCompany) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && doc.status !== selectedStatus) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [documents, globalSearch, selectedType, selectedCompany, selectedStatus, sortField, sortAsc]);

  const handleSort = (field: keyof SAPDocument) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['DocNumber,Type,TCode,CompanyCode,Partner,Date,Currency,NetTotal,GrossTotal,Status\n'];
    const rows = filteredDocs.map((d) =>
      `"${d.docNumber}","${d.typeName}","${d.tcode}","${d.companyCode}","${d.customer?.name || d.vendor?.name || '-'}","${d.docDate}","${d.currency}",${d.netTotal},${d.grossTotal},"${d.status}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `consulta_sap_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Criterios de Búsqueda y Filtros SAP
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            Exportar a Excel (CSV)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Tipo de Documento */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Tipo de Documento (SD / MM / FI)
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="SD_ORDER">Pedidos de Venta (VA03)</option>
              <option value="MM_ORDER">Pedidos de Compra (ME23N)</option>
              <option value="SD_INVOICE">Facturas Comerciales (VF03)</option>
              <option value="SD_DELIVERY">Entregas de Salida (VL03N)</option>
              <option value="FI_DOC">Documentos Contables (FB03)</option>
            </select>
          </div>

          {/* Sociedad */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Sociedad (BUKRS)
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Sociedades</option>
              <option value="1000">1000 - Sede Principal Colombia</option>
              <option value="2000">2000 - Regional Exportaciones</option>
              <option value="3000">3000 - Filial Internacional</option>
            </select>
          </div>

          {/* Estado del Documento */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Estado de Tratamiento
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Liberado">Liberado / Aprobado</option>
              <option value="Contabilizado">Contabilizado</option>
              <option value="En Tránsito">En Tránsito / En Proceso</option>
              <option value="Bloqueado">Bloqueado por Crédito/Calidad</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedCompany('ALL');
                setSelectedStatus('ALL');
              }}
              className="w-full text-xs py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Results Count and Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold">
            Resultados Encontrados:{' '}
            <span className="text-blue-400 font-mono font-bold">{filteredDocs.length}</span> documentos
          </span>
          <span className="text-slate-500 text-[11px]">
            Haga clic en cualquier fila o en el botón para ver detalle y flujo completo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th
                  onClick={() => handleSort('docNumber')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Doc. SAP</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Tipo / T-Code</th>
                <th className="py-3 px-4">Sociedad</th>
                <th className="py-3 px-4">Cliente / Proveedor</th>
                <th
                  onClick={() => handleSort('docDate')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('grossTotal')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Importe Total</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No se encontraron documentos SAP con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="hover:bg-blue-600/10 transition-colors cursor-pointer group"
                  >
                    {/* Document Number */}
                    <td className="py-3 px-4 font-mono font-bold text-white group-hover:text-blue-300">
                      {doc.docNumber}
                    </td>

                    {/* Type & TCode */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{doc.typeName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                          {doc.tcode}
                        </span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {doc.companyCode}
                    </td>

                    {/* Customer / Vendor */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">
                        {doc.customer?.name || doc.vendor?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {doc.customer?.id || doc.vendor?.id || ''}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {doc.docDate}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {doc.currency} {doc.grossTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          doc.status === 'Liberado' || doc.status === 'Contabilizado'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : doc.status === 'Bloqueado'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                        }}
                        className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
                        title="Ver detalle de documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
