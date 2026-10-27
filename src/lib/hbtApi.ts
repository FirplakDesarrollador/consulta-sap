import { NextResponse } from 'next/server';
import { fetchFieldDefs, findTable } from '@/lib/hbt';
import { HbtFieldDef, HbtMode, HbtTableInfo } from '@/types/hbt';

/** Utilidades compartidas por las rutas /api/sap/hbt/tables/** */

export type TableCtx = { params: Promise<{ table: string }> };
export type RecordCtx = { params: Promise<{ table: string; code: string }> };

const MODE_LABEL: Record<HbtMode, string> = {
  crud: 'crear, modificar y eliminar',
  config: 'crear, modificar y eliminar (parametrización del complemento)',
  patch: 'solo modificar registros existentes',
  readonly: 'solo lectura'
};

export const modeDescription = (m: HbtMode) => MODE_LABEL[m];

/** Resuelve la tabla (debe existir en UserTablesMD como tabla sin objeto) y sus campos de usuario */
export async function resolveTable(raw: string): Promise<{ table: HbtTableInfo; defs: HbtFieldDef[]; warnings: string[] } | { error: NextResponse }> {
  const found = await findTable(raw);
  if (!found) {
    return { error: NextResponse.json({ success: false, error: `La tabla ${raw} no es una tabla de Localización HBT disponible en SAP` }, { status: 404 }) };
  }
  if ('error' in found) {
    return { error: NextResponse.json({ success: false, error: found.error }, { status: 502 }) };
  }
  const f = await fetchFieldDefs(`@${found.table.name}`);
  if (!f) {
    return { error: NextResponse.json({ success: false, error: `No se pudo leer la definición de campos de ${found.table.name} (UserFieldsMD)` }, { status: 502 }) };
  }
  return { table: found.table, defs: f.defs, warnings: f.warnings };
}

/** Respuesta 405 cuando la operación no está permitida para el modo de la tabla */
export function methodNotAllowed(table: HbtTableInfo, op: string, why: string) {
  return NextResponse.json(
    {
      success: false,
      error: `${op} no está habilitado en ${table.name}: ${why}. Modo de la tabla: ${modeDescription(table.mode)}.`,
      mode: table.mode
    },
    { status: 405 }
  );
}

export const readOnlyReason = (name: string) =>
  name === 'HBT_FE_PARAMETRO'
    ? 'contiene credenciales y endpoints del proveedor de facturación electrónica'
    : 'son registros transaccionales, bitácoras o tablas de trabajo que escribe el propio complemento HBT';
