'use client';

import React, { useState, useEffect } from 'react';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import {
  X,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Users,
  CreditCard,
  FileCode2,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Printer,
  Share2,
  ShieldCheck,
  FileText,
  BadgeAlert,
  Calendar,
  Layers,
  Landmark,
  ArrowUpRight,
  BarChart3,
  Pencil,
  Plus
} from 'lucide-react';
import { BusinessPartnerDetail } from '@/types/sapBusiness';
import { AccountBalanceModal } from './AccountBalanceModal';
import { EditContactModal } from './EditContactModal';

interface BusinessPartnerDetailModalProps {
  cardCode: string | null;
  onClose: () => void;
}

export const BusinessPartnerDetailModal: React.FC<BusinessPartnerDetailModalProps> = ({
  cardCode,
  onClose
}) => {
  const [detail, setDetail] = useState<BusinessPartnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'addresses' | 'contacts' | 'finance' | 'hbt' | 'raw'>('general');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const handleOpenEditContact = (contact: any) => {
    setSelectedContact(contact);
    setIsEditContactModalOpen(true);
  };

  const handleOpenCreateContact = () => {
    setSelectedContact(null);
    setIsEditContactModalOpen(true);
  };

  const handleContactSuccess = (savedContact: any, isNew: boolean) => {
    if (!detail) return;
    if (isNew) {
      setDetail({
        ...detail,
        contacts: [...(detail.contacts || []), savedContact]
      });
    } else {
      setDetail({
        ...detail,
        contacts: (detail.contacts || []).map((c) =>
          (c.id && c.id === savedContact.id) || (c.name === savedContact.name && !c.id)
            ? { ...c, ...savedContact }
            : c
        )
      });
    }
  };

  useEffect(() => {
    if (!cardCode) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const encoded = encodeURIComponent(cardCode);
        const res = await fetch(`/api/sap/business-partners/${encoded}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data);
        } else {
          setError(json.error || 'No se pudo cargar la información del socio de negocios');
        }
      } catch (err: any) {
        setError(err.message || 'Error de comunicación con SAP Service Layer');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [cardCode]);

  if (!cardCode) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                    {detail?.cardCode || cardCode}
                  </h3>
                  {detail && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        detail.cardType === 'Cliente'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : detail.cardType === 'Proveedor'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {detail.cardType}
                    </span>
                  )}
                  {detail && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        detail.status === 'Activo'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      ● {detail.status}
                    </span>
                  )}
                  {detail?.groupName && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono">
                      {detail.groupName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  {detail?.cardName || 'Consultando datos maestros en SAP...'} {detail?.taxId && `• NIT: ${detail.taxId}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <button
                onClick={() => handleCopy(detail.cardCode, 'cardCode')}
                title="Copiar Código SAP"
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
              >
                {copiedField === 'cardCode' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">Copiar Código</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-300 transition shadow-2xs"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Mirrors SAP Business One Master Data Screen) */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Pestaña General (SAP)</span>
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Direcciones ({detail?.addresses?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'contacts'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Contactos ({detail?.contacts?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'finance'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Finanzas & Pagos</span>
          </button>
          <button
            onClick={() => setActiveTab('hbt')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'hbt'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Localización HBT</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'raw'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="h-4 w-4" />
            <span>JSON SAP</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-xs font-semibold text-slate-600">
                Obteniendo ficha de datos maestros en SAP Service Layer...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Error al consultar el socio:</span> {error}
              </div>
            </div>
          ) : detail ? (
            <>
              {/* TAB 1: PESTAÑA GENERAL (Mirrors SAP Screen) */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Top Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div
                      onClick={() => setIsBalanceModalOpen(true)}
                      role="button"
                      tabIndex={0}
                      title="Haga clic para consultar el extracto de cuenta y movimientos contables en SAP (últimos 6 meses por defecto)"
                      className="p-3.5 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200 hover:border-amber-400 shadow-2xs hover:shadow-md cursor-pointer transition-all group relative select-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-500 group-hover:text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Saldo en Cuenta</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-200">
                            Ver detalle
                          </span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 group-hover:text-amber-950 mt-1 font-mono">
                        {detail.currency} {detail.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                        <span>● Últimos 6 meses por defecto (Clic aquí)</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        NIT / Identificación
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 mt-1 font-mono flex items-center justify-between">
                        <span>{detail.taxId}</span>
                        <button
                          onClick={() => handleCopy(detail.taxId, 'taxId')}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copiar NIT"
                        >
                          {copiedField === 'taxId' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pedidos Abiertos
                      </div>
                      <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                        {detail.currency} {(detail.openOrdersBalance || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Persona de Contacto
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 mt-1 truncate" title={detail.contactPerson || 'No asignada'}>
                        {detail.contactPerson || '—'}
                      </div>
                    </div>
                  </div>

                  {/* General Tab Fields (SAP 2-Column layout) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Contact and Channels */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <Phone className="h-4 w-4 text-amber-600" />
                        <span>Canales de Contacto Directo</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Teléfono 1</label>
                          <span className="font-semibold text-slate-800">{detail.phone1 || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Teléfono 2</label>
                          <span className="font-semibold text-slate-800">{detail.phone2 || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Teléfono Móvil</label>
                          <span className="font-semibold text-slate-800">{detail.cellular || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Fax</label>
                          <span className="font-semibold text-slate-800">{detail.fax || '—'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Correo Electrónico</label>
                          <span className="font-semibold text-blue-600 hover:underline">
                            {detail.email ? (
                              <a href={`mailto:${detail.email}`}>{detail.email}</a>
                            ) : (
                              <span className="text-slate-400 font-normal">Sin correo registrado</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Sitio Web</label>
                          <span className="font-semibold text-blue-600 hover:underline">
                            {detail.website ? (
                              <a href={detail.website.startsWith('http') ? detail.website : `https://${detail.website}`} target="_blank" rel="noreferrer">
                                {detail.website}
                              </a>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Forma de Envío</label>
                          <span className="font-semibold text-slate-800">{detail.shippingType || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Proyecto de Socio de Negocio</label>
                          <span className="font-semibold text-slate-800">{detail.projectCode || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Identification, Territory, Classification */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span>Clasificación & Parámetros Fiscales</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Nombre Alias</label>
                          <span className="font-semibold text-slate-800">{detail.aliasName || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Nombre Extranjero</label>
                          <span className="font-semibold text-slate-800">{detail.foreignName || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">ID Número 2</label>
                          <span className="font-semibold text-slate-800">{detail.additionalId || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">ID Fiscal Federal Unificado</label>
                          <span className="font-semibold text-slate-800">{detail.unifiedFederalTaxId || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Territorio</label>
                          <span className="font-semibold text-slate-800">{detail.territory || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Código Canal SN</label>
                          <span className="font-semibold text-slate-800">{detail.channelPartnerCode || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">GLN (Global Location)</label>
                          <span className="font-semibold text-slate-800">{detail.globalLocationNumber || '—'}</span>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-400 block">Industria / Sector</label>
                          <span className="font-semibold text-slate-800">{detail.industry || '—'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-700 font-semibold">Bloquear envío de contenido marketing:</span>
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                            detail.blockMarketing ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {detail.blockMarketing ? 'Sí (Bloqueado)' : 'No (Permitido)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Comments and Notes */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <span>Comentarios / Observaciones en SAP</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 min-h-[60px] whitespace-pre-wrap">
                      {detail.notes ? <LinkifiedText text={detail.notes} /> : <span className="text-slate-400 italic">Sin comentarios registrados en el socio de negocios.</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECCIONES */}
              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Direcciones fiscales y de entrega registradas en SAP Business One (BPAddresses)
                  </div>
                  {detail.addresses && detail.addresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detail.addresses.map((addr, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{addr.addressName}</span>
                            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              addr.addressType === 'Facturación'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {addr.addressType}
                            </span>
                          </div>
                          <div className="text-xs space-y-1 text-slate-600">
                            <div><strong className="text-slate-800">Dirección / Calle:</strong> {addr.street}</div>
                            {addr.block && <div><strong className="text-slate-800">Barrio / Bloque:</strong> {addr.block}</div>}
                            <div><strong className="text-slate-800">Ciudad:</strong> {addr.city}</div>
                            {addr.state && <div><strong className="text-slate-800">Departamento / Región:</strong> {addr.state}</div>}
                            <div><strong className="text-slate-800">País:</strong> {addr.country}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                      No hay direcciones registradas para este socio de negocio.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONTACTOS */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <div>
                      <div className="text-xs text-slate-700 font-bold">
                        Personas de contacto registradas en SAP Business One
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Subcolección ContactEmployees (OCPR). Sincronizado vía PATCH con SAP Service Layer.
                      </div>
                    </div>
                    <button
                      onClick={handleOpenCreateContact}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nuevo Contacto</span>
                    </button>
                  </div>

                  {detail.contacts && detail.contacts.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                          <tr>
                            <th className="py-3 px-4">Nombre Completo</th>
                            <th className="py-3 px-4">Posición / Cargo</th>
                            <th className="py-3 px-4">Teléfono</th>
                            <th className="py-3 px-4">Celular</th>
                            <th className="py-3 px-4">Correo Electrónico</th>
                            <th className="py-3 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {detail.contacts.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-slate-50 transition group">
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{c.name}</span>
                                  {c.id && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-mono font-normal rounded">
                                      ID: {c.id}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">{c.position}</td>
                              <td className="py-3 px-4 font-mono text-slate-600">{c.phone || '—'}</td>
                              <td className="py-3 px-4 font-mono text-slate-600">{c.cellPhone || '—'}</td>
                              <td className="py-3 px-4 text-blue-600 hover:underline">
                                {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleOpenEditContact(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition shadow-2xs"
                                  title={`Editar datos de ${c.name} en SAP`}
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Editar</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                      No hay personas de contacto adicionales registradas para este socio.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FINANZAS & PAGOS */}
              {activeTab === 'finance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                        <Landmark className="h-4 w-4 text-amber-600" />
                        <span>Saldos y Compromisos Comerciales</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Saldo Actual en Cartera:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-slate-900 text-sm">
                              {detail.currency} {detail.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              onClick={() => setIsBalanceModalOpen(true)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1 transition shadow-2xs"
                              title="Consultar extracto y operaciones de saldo"
                            >
                              <span>Ver Movimientos (6 meses)</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-600">Pedidos de Venta Abiertos:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {detail.currency} {(detail.openOrdersBalance || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-600">Oportunidades Comerciales:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {detail.openOpportunities || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                        <span>Métodos de Pago Asociados</span>
                      </div>
                      {detail.paymentMethods && detail.paymentMethods.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {detail.paymentMethods.map((pm, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800">
                              {pm.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No hay métodos de pago explícitos asignados.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: LOCALIZACIÓN HBT */}
              {activeTab === 'hbt' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      <span>Campos de Localización Colombiana HBT / DIAN</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Tipo Documento (TipDoc)</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.tipDoc || '—'}</span>
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Régimen Tributario</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.regTrib || '—'}</span>
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Municipio DIAN (MunMed)</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.munMed || '—'}</span>
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Primer Nombre / Razón Social</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.nombres || '—'}</span>
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Primer Apellido</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.apellido1 || '—'}</span>
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-400 block">Segundo Apellido</label>
                        <span className="font-semibold text-slate-800">{detail.hbtLocalization?.apellido2 || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: RAW JSON */}
              {activeTab === 'raw' && (
                <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px]">
                  <pre>{JSON.stringify(detail.raw || detail, null, 2)}</pre>
                </div>
              )}
            </>
          ) : null}
        </div>
        {/* Account Balance Detail Modal */}
        {isBalanceModalOpen && detail && (
          <AccountBalanceModal
            cardCode={detail.cardCode}
            cardName={detail.cardName}
            currency={detail.currency}
            currentBalance={detail.balance}
            onClose={() => setIsBalanceModalOpen(false)}
          />
        )}

        {/* Edit Contact Modal */}
        {isEditContactModalOpen && detail && (
          <EditContactModal
            cardCode={detail.cardCode}
            contact={selectedContact}
            isOpen={isEditContactModalOpen}
            onClose={() => setIsEditContactModalOpen(false)}
            onSuccess={handleContactSuccess}
          />
        )}
      </div>
    </div>
  );
};
