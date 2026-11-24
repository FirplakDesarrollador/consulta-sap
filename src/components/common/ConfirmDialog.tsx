'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneClass = {
  danger: 'bg-rose-600 hover:bg-rose-700',
  warning: 'bg-amber-600 hover:bg-amber-700',
  primary: 'bg-blue-600 hover:bg-blue-700'
};

/** Diálogo de confirmación para acciones que escriben en SAP */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  tone = 'danger',
  isBusy = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
            <div className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 text-xs font-bold">
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-4 py-2 rounded-xl text-white flex items-center gap-1.5 disabled:opacity-60 ${toneClass[tone]}`}
          >
            {isBusy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
