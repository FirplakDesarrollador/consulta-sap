'use client';

import React from 'react';
import { Users, Percent, MapPin, FileCheck2, Database, ShieldAlert, Lock } from 'lucide-react';
import { useSapQuery } from '@/lib/useSapQuery';
import { HbtCategoryInfo, HbtEInvoiceSummary, HbtTableInfo } from '@/types/hbt';
import { hbtCardCls, WritesBadge } from './hbtUi';

export type HbtTab = 'resumen' | 'terceros' | 'retenciones' | 'municipios' | 'fe' | 'tablas';

interface Props {
  refreshKey?: number;
  onNavigate: (tab: HbtTab, table?: string) => void;
}

const since = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

/** Resumen del módulo: qué expone Localización HBT en SAP y el estado de facturación electrónica de los últimos 30 días */
export const HbtOverview: React.FC<Props> = ({ refreshKey = 0, onNavigate }) => {
  const dirQ = useSapQuery<HbtTableInfo[]>('/api/sap/hbt/tables', [refreshKey]);
  const cats = (dirQ.json?.categories as (HbtCategoryInfo & { tables: number })[] | undefined) ?? [];
  const nTables = dirQ.data?.length ?? null;
  const writesEnabled = dirQ.json ? Boolean(dirQ.json.writesEnabled) : null;
  const [from] = React.useState(since);
  const sumQ = useSapQuery<HbtEInvoiceSummary>(`/api/sap/hbt/einvoicing/summary?type=invoices&from=${from}`, [refreshKey]);
  const whQ = useSapQuery<unknown[]>('/api/sap/hbt/withholdings?limit=10&inactive=all', [refreshKey]);
  const whTotal = typeof whQ.json?.total === 'number' ? (whQ.json.total as number) : null;
  const ptQ = useSapQuery<unknown[]>('/api/sap/hbt/partners?limit=10', [refreshKey]);
  const ptTotal = typeof ptQ.json?.total === 'number' ? (ptQ.json.total as number) : null;

  const cards = [
    { tab: 'terceros' as const, icon: Users, title: 'Terceros', value: ptTotal, text: 'Socios con régimen tributario, tipo de documento, municipio, autorretenedor y datos de facturación electrónica (campos U_HBT_* de OCRD).' },
    { tab: 'retenciones' as const, icon: Percent, title: 'Retenciones', value: whTotal, text: 'Códigos de retención con tipo HBT, base mínima, afectación y parametrización para medios magnéticos (U_HBT_* de OWHT).' },
    { tab: 'municipios' as const, icon: MapPin, title: 'Municipios', value: null, text: 'Municipios y departamentos (códigos DANE) usados por ICA y medios magnéticos. Se crean, editan y eliminan.' },
    { tab: 'fe' as const, icon: FileCheck2, title: 'Facturación electrónica', value: null, text: 'Estado de cada documento ante la DIAN (pendiente, enviado, aprobado, rechazado). Solo lectura.' },
    { tab: 'tablas' as const, icon: Database, title: 'Tablas HBT', value: nTables, text: 'Todas las tablas de usuario del complemento (HBT_, BPCO_, HEIN_) con visor y editor genérico según el modo de cada una.' }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <WritesBadge enabled={writesEnabled} />
        <span className="text-[11px] text-slate-500">
          Localización HBT es un complemento de SAP B1: guarda su información en tablas y campos de usuario que se leen y modifican por el Service Layer.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button key={c.tab} onClick={() => onNavigate(c.tab)} className={`${hbtCardCls} text-left hover:border-indigo-300 hover:shadow-md transition`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <c.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{c.title}</span>
              {c.value !== null && <span className="ml-auto text-sm font-extrabold text-indigo-700">{c.value.toLocaleString('es-ES')}</span>}
            </div>
            <p className="mt-2 text-[11.5px] text-slate-600 leading-relaxed">{c.text}</p>
          </button>
        ))}
      </div>

      <div className={hbtCardCls}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-extrabold text-slate-900">Facturas de venta · estado de facturación electrónica (desde {from})</h4>
          <button onClick={() => onNavigate('fe')} className="text-[11px] font-bold text-indigo-700 hover:underline">
            Ver documentos
          </button>
        </div>
        {sumQ.error && <p className="text-xs text-rose-700">{sumQ.error}</p>}
        {sumQ.isLoading && <p className="text-xs text-slate-500">Contando documentos en SAP…</p>}
        {sumQ.data && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-500">Total</div>
              <div className="text-lg font-extrabold text-slate-900">{sumQ.data.total.toLocaleString('es-ES')}</div>
            </div>
            {sumQ.data.byStatus.map((s) => (
              <div key={s.code}>
                <div className="text-[11px] font-bold text-slate-500">{s.label}</div>
                <div className={`text-lg font-extrabold ${s.code === 5 && s.count > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{s.count.toLocaleString('es-ES')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={hbtCardCls}>
        <h4 className="text-xs font-extrabold text-slate-900 mb-3">Tablas del complemento por categoría</h4>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.id} onClick={() => onNavigate('tablas', `cat:${c.id}`)} title={c.description} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
              {c.label} <span className="opacity-60">({c.tables})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-[11.5px] text-slate-600 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Lock className="h-3.5 w-3.5" /> Qué no se puede modificar desde aquí
        </div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Los documentos (facturas, notas crédito, entregas) y su estado de facturación electrónica: solo lectura; el envío y reintento los hace el complemento.</li>
          <li>Tablas transaccionales, bitácoras y de trabajo del complemento (EDI, diferidos, cartera, legalizaciones…): solo lectura.</li>
          <li>Parámetros de facturación electrónica (HBT_FE_PARAMETRO): solo lectura y sin credenciales; los campos con claves, usuarios o tokens nunca se leen.</li>
          <li>Códigos de retención: no se crean ni eliminan; solo se editan sus campos HBT.</li>
        </ul>
        <div className="flex items-center gap-2 pt-1 text-slate-500">
          <ShieldAlert className="h-3.5 w-3.5" /> Toda escritura admite “Simular” (muestra la petición sin enviarla) y exige SAP_ALLOW_WRITES=true en el servidor.
        </div>
      </div>
    </div>
  );
};
