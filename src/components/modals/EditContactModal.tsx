'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Phone, Smartphone, Briefcase, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ContactData {
  id?: number;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  address?: string;
  phone?: string;
  cellPhone?: string;
  email?: string;
}

interface EditContactModalProps {
  cardCode: string;
  contact: ContactData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContact: ContactData, isNew: boolean) => void;
}

export const EditContactModal: React.FC<EditContactModalProps> = ({
  cardCode,
  contact,
  isOpen,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(contact && contact.id);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    cellPhone: '',
    email: '',
    address: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        position: contact.position && contact.position !== '—' ? contact.position : '',
        phone: contact.phone || '',
        cellPhone: contact.cellPhone || '',
        email: contact.email || '',
        address: contact.address || ''
      });
    } else {
      setFormData({
        name: '',
        position: '',
        phone: '',
        cellPhone: '',
        email: '',
        address: ''
      });
    }
    setError(null);
    setSuccessMessage(null);
  }, [contact, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre del contacto es obligatorio.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payloadContact: Record<string, any> = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        cellPhone: formData.cellPhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim()
      };

      if (isEditing && contact?.id) {
        payloadContact.id = contact.id;
      }

      const encoded = encodeURIComponent(cardCode);
      const res = await fetch(`/api/sap/business-partners/${encoded}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact: payloadContact
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo actualizar el contacto en SAP Business One');
      }

      setSuccessMessage(json.message || 'Contacto guardado correctamente en SAP');
      
      const updatedItem: ContactData = {
        id: contact?.id,
        name: formData.name.trim(),
        position: formData.position.trim() || '—',
        phone: formData.phone.trim(),
        cellPhone: formData.cellPhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim()
      };

      setTimeout(() => {
        onSuccess(updatedItem, !isEditing);
        onClose();
      }, 700);

    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con SAP Service Layer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Editar Contacto en SAP' : 'Nuevo Contacto en SAP'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Socio: <span className="font-semibold text-slate-700">{cardCode}</span>
                {isEditing && contact?.id ? ` • ID Contacto: ${contact.id}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          <div className="space-y-3">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo / Identificador SAP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. FRANCY ARREDONDO"
                  className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900 font-medium"
                />
                <Users className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Cargo / Posición */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cargo / Posición
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Ej. ASESORA COMERCIAL / GERENTE"
                  className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900"
                />
                <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Teléfono & Celular en 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono Fijo (Phone1)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(574) 4445200"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900 font-mono"
                  />
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Celular / Móvil
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cellPhone}
                    onChange={(e) => setFormData({ ...formData, cellPhone: e.target.value })}
                    placeholder="3116340440"
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900 font-mono"
                  />
                  <Smartphone className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@empresa.com"
                  className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900"
                />
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dirección / Sede
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej. Calle 47 # 53 - 82"
                  className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-slate-900"
                />
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Service layer note badge */}
          <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
            <span className="font-medium">
              ⚡ Sincronización en directo con SAP Business One (Service Layer)
            </span>
            <span className="font-mono text-[10px] bg-amber-200/70 px-1.5 py-0.5 rounded font-bold">
              PATCH /b1s/v1/BusinessPartners
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando en SAP...</span>
                </>
              ) : (
                <span>{isEditing ? 'Guardar Cambios' : 'Crear Contacto'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
