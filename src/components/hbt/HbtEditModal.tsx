'use client';

import React, { useState } from 'react';
import { X, FlaskConical, Save, Trash2, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import { sapWrite, WriteResult } from '@/lib/comprasApi';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { WriteFeedback } from '../compras/WriteFeedback';
import { HbtFieldDef, HbtValue } from '@/types/hbt';
import { HbtFieldInput } from './HbtFieldInput';
import { hbtInputCls } from './hbtUi';
import { LinkifiedText } from '../common/LinkifiedText';
import { safeHttpUrl } from '@/lib/linkify';

export type HbtModalField = HbtFieldDef & { readOnly?: boolean };

interface Props {
  title: string;
  subtitle?: string;
  /** table: tabla de usuario (Code/Name + campos). fields: campos HBT de una entidad estándar (socio, retención) */
  variant: 'table' | 'fields';
  defs: HbtModalField[];
  initial: Record<string, HbtValue>;
  isCreate?: boolean;
  code?: string;
  name?: string;
  /** Sin permiso de escritura (tabla de solo lectura): muestra los datos sin acciones */
  readOnly?: boolean;
  readOnlyNote?: string;
  warning?: string;
  /** URL de la escritura: POST (crear) o PATCH (editar) */
  writeUrl: string;
  /** URL base de DELETE (se agrega ?confirm=<código>) */
  deleteUrl?: string;
  /** Campos adicionales de solo lectura que se muestran arriba (p. ej. retenciones del socio) */
  extra?: React.ReactNode;
  onClose: () => void;
  onSaved: () => void;
}

const asText = (v: HbtValue | undefined) => (v === null || v === undefined ? '' : String(v));
const isNumeric = (k: HbtFieldDef['kind']) => k === 'int' || k === 'number' || k === 'time';

/** Modal compartido de creación, edición y eliminación con simulación (?dryRun=1) previa a SAP */
export const HbtEditModal: React.FC<Props> = ({
  title,
  subtitle,
  variant,
  defs,
  initial,
  isCreate = false,
  code = '',
  name = '',
  readOnly = false,
  readOnlyNote,
  warning,
  writeUrl,
  deleteUrl,
  extra,
  onClose,
  onSaved
}) => {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const d of defs) v[d.name] = asText(initial[d.name]) || (isCreate ? d.defaultValue : '');
    return v;
  });
  const [newCode, setNewCode] = useState(code);
  const [newName, setNewName] = useState(name);
  const [busy, setBusy] = useState<'dry' | 'save' | 'delete' | null>(null);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [done, setDone] = useState(false);

  const editable = defs.filter((d) => !d.readOnly);
  const canWrite = !readOnly && !done;

  /** Cuerpo de la petición; devuelve errores locales si hay un valor que el Service Layer no admite */
  const build = (): { body?: unknown; errors: string[] } => {
    const errors: string[] = [];
    const fields: Record<string, string | number> = {};
    for (const d of editable) {
      const cur = values[d.name] ?? '';
      const before = asText(initial[d.name]);
      if (!isCreate && cur === before) continue;
      if (isCreate && cur === '') continue;
      if (cur === '' && d.kind !== 'text' && d.kind !== 'longtext') {
        errors.push(`${d.label}: un campo numérico o de fecha no se puede vaciar una vez que tiene valor`);
        continue;
      }
      if (isNumeric(d.kind)) {
        const n = Number(cur);
        if (!Number.isFinite(n)) {
          errors.push(`${d.label}: debe ser un número`);
          continue;
        }
        fields[d.name] = n;
      } else {
        fields[d.name] = cur;
      }
    }
    if (variant === 'table') {
      if (isCreate) {
        if (!newCode.trim()) errors.push('El código es obligatorio');
        for (const d of editable) if (d.mandatory && !(d.name in fields)) errors.push(`${d.label}: obligatorio`);
        return { errors, body: { code: newCode.trim(), name: newName.trim() || undefined, fields } };
      }
      const body: { name?: string; fields: Record<string, string | number> } = { fields };
      if (newName !== name) body.name = newName;
      if (Object.keys(fields).length === 0 && newName === name) errors.push('No hay cambios para enviar');
      return { errors, body };
    }
    if (Object.keys(fields).length === 0) errors.push('No hay cambios para enviar');
    return { errors, body: { fields } };
  };

  const submit = async (dryRun: boolean) => {
    const { body, errors } = build();
    setLocalErrors(errors);
    if (errors.length > 0) return;
    setBusy(dryRun ? 'dry' : 'save');
    const r = await sapWrite(writeUrl, isCreate ? 'POST' : 'PATCH', body, { dryRun });
    setResult(r);
    setBusy(null);
    if (r.ok && !r.dryRun) {
      setDone(true);
      onSaved();
    }
  };

  const doDelete = async (dryRun: boolean) => {
    if (!deleteUrl) return;
    setBusy('delete');
    const url = `${deleteUrl}?confirm=${encodeURIComponent(code)}`;
    const r = await sapWrite(url, 'DELETE', undefined, { dryRun });
    setResult(r);
    setBusy(null);
    setConfirmDelete(false);
    if (r.ok && !r.dryRun) {
      setDone(true);
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {readOnly && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{readOnlyNote || 'Registro de solo lectura.'}</span>
            </div>
          )}
          {warning && canWrite && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          )}
          {extra}

          {variant === 'table' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Código (Code){isCreate && <span className="text-rose-600"> *</span>}</label>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  disabled={!isCreate || !canWrite}
                  maxLength={30}
                  className={`${hbtInputCls} font-mono`}
                />
                {!isCreate && <p className="mt-1 text-[10.5px] text-slate-500">La clave del registro no se puede modificar.</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre (Name)</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} disabled={!canWrite} maxLength={30} className={hbtInputCls} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {defs.map((d) => (
              <div key={d.name} className={d.kind === 'longtext' ? 'sm:col-span-2' : ''}>
                <HbtFieldInput
                  def={d}
                  value={values[d.name] ?? ''}
                  onChange={(v) => setValues((s) => ({ ...s, [d.name]: v }))}
                  disabled={!canWrite}
                  readOnlyReason={d.readOnly ? 'Solo lectura: lo mantiene el complemento HBT' : undefined}
                />
                {safeHttpUrl(values[d.name]) && (
                  <div className="mt-1 text-[11px]">
                    <LinkifiedText text={String(values[d.name])} />
                  </div>
                )}
              </div>
            ))}
            {defs.length === 0 && <p className="text-xs text-slate-500">Esta tabla no tiene campos de usuario además de Code y Name.</p>}
          </div>

          {localErrors.length > 0 && (
            <ul className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 font-semibold list-disc list-inside">
              {localErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <WriteFeedback result={result} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-200 text-xs font-bold">
          <div>
            {canWrite && !isCreate && deleteUrl && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy !== null}
                className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
              {done ? 'Cerrar' : 'Cancelar'}
            </button>
            {canWrite && (
              <>
                <button
                  onClick={() => submit(true)}
                  disabled={busy !== null}
                  className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'dry' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />} Simular
                </button>
                <button
                  onClick={() => submit(false)}
                  disabled={busy !== null}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'save' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {isCreate ? 'Crear en SAP' : 'Guardar en SAP'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar registro"
        message={
          <>
            Se eliminará el registro <b className="font-mono">{code}</b> de SAP. Puede simular primero para ver la petición que se enviaría.
          </>
        }
        confirmLabel="Eliminar en SAP"
        isBusy={busy === 'delete'}
        onConfirm={() => doDelete(false)}
        onCancel={() => setConfirmDelete(false)}
      />
      {confirmDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80]">
          <button onClick={() => doDelete(true)} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Simular eliminación
          </button>
        </div>
      )}
    </div>
  );
};
