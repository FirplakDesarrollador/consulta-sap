import { NextResponse } from 'next/server';
import { sapWritesEnabled } from '@/lib/purchasing';
import { resolveTable, TableCtx } from '@/lib/hbtApi';
import { HbtTableSchema } from '@/types/hbt';

/**
 * GET /api/sap/hbt/tables/[table]/schema
 * Definición de la tabla: modo de operación y campos de usuario (UserFieldsMD: tipo, tamaño, obligatorio, valor por
 * defecto, tabla vinculada y valores válidos). Los campos con credenciales se listan como `secret` y no se leen.
 */
export async function GET(_request: Request, ctx: TableCtx) {
  const { table: raw } = await ctx.params;
  const r = await resolveTable(raw);
  if ('error' in r) return r.error;
  const data: HbtTableSchema = { table: r.table, fields: r.defs, warnings: r.warnings };
  return NextResponse.json({ success: true, writesEnabled: sapWritesEnabled(), data, timestamp: new Date().toISOString() });
}
