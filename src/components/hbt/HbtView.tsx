'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { HbtEInvoicingView } from './HbtEInvoicingView';
import { HbtMunicipiosView } from './HbtMunicipiosView';
import { HbtOverview, HbtTab } from './HbtOverview';
import { HbtPartnersView } from './HbtPartnersView';
import { HbtTablesView } from './HbtTablesView';
import { HbtWithholdingsView } from './HbtWithholdingsView';

interface Props {
  globalFilter?: string;
  refreshKey?: number;
}

const TABS: { id: HbtTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'terceros', label: 'Terceros' },
  { id: 'retenciones', label: 'Retenciones' },
  { id: 'municipios', label: 'Municipios' },
  { id: 'fe', label: 'Facturación electrónica' },
  { id: 'tablas', label: 'Tablas HBT' }
];

/**
 * Localización HBT (complemento colombiano de SAP B1): resumen, terceros, retenciones, municipios, facturación electrónica
 * y un visor/editor genérico de todas las tablas de usuario del complemento.
 */
export const HbtView: React.FC<Props> = ({ globalFilter = '', refreshKey = 0 }) => {
  const [tab, setTab] = useState<HbtTab>('resumen');
  const [tablesKey, setTablesKey] = useState(0);
  const [initialTable, setInitialTable] = useState<string | null>(null);
  const [initialCategory, setInitialCategory] = useState<string | null>(null);

  const navigate = (t: HbtTab, table?: string) => {
    setTab(t);
    // `cat:<id>` solo abre la pestaña de tablas; un nombre de tabla la abre directamente
    setInitialTable(table && !table.startsWith('cat:') ? table : null);
    setInitialCategory(table && table.startsWith('cat:') ? table.slice(4) : null);
    setTablesKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Globe className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Localización HBT</h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">SAP Real Server-Side</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${tab === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'resumen' && <HbtOverview refreshKey={refreshKey} onNavigate={navigate} />}
      {tab === 'terceros' && <HbtPartnersView refreshKey={refreshKey} globalFilter={globalFilter} />}
      {tab === 'retenciones' && <HbtWithholdingsView refreshKey={refreshKey} globalFilter={globalFilter} />}
      {tab === 'municipios' && <HbtMunicipiosView refreshKey={refreshKey} />}
      {tab === 'fe' && <HbtEInvoicingView refreshKey={refreshKey} globalFilter={globalFilter} />}
      {tab === 'tablas' && <HbtTablesView key={tablesKey} refreshKey={refreshKey} globalFilter={globalFilter} initialTable={initialTable} initialCategory={initialCategory} />}
    </div>
  );
};
