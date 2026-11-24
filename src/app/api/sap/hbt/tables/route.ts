import { NextResponse } from 'next/server';
import { sapWritesEnabled } from '@/lib/purchasing';
import { cachedCount, countTable, getTableDirectory, HBT_CATEGORIES, mapLimit } from '@/lib/hbt';
import { HbtTableInfo } from '@/types/hbt';

/**
 * GET /api/sap/hbt/tables
 * Directorio de las tablas de usuario de Localización HBT (UserTablesMD, tipo bott_NoObject → entidad U_<TABLA>):
 * prefijos HBT_ (complemento), BPCO_ (versión anterior del complemento) y HEIN_ (EDI). Solo lectura.
 *   ?category=<id>  limita la lista a una categoría
 *   ?counts=1       agrega el número de filas (consulta $count por tabla, con presupuesto de 20 s por llamada, caché 10 min;
 *                   la respuesta trae `pending` = tablas aún sin contar → repetir hasta 0).
 *                   Requiere ?category para no consultar las 150+ tablas de una sola vez.
 */
const COUNT_BUDGET_MS = 20_000;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const category = sp.get('category') || '';
  const wantCounts = sp.get('counts') === '1';
  if (category && !HBT_CATEGORIES.some((c) => c.id === category)) {
    return NextResponse.json({ success: false, error: `Categoría desconocida: ${category}` }, { status: 400 });
  }
  if (wantCounts && !category) {
    return NextResponse.json({ success: false, error: 'counts=1 requiere ?category=<id> (evita consultar todas las tablas a la vez)' }, { status: 400 });
  }

  const dir = await getTableDirectory();
  if (!dir) {
    return NextResponse.json({ success: false, error: 'No se pudo consultar el directorio de tablas de usuario en SAP (UserTablesMD)' }, { status: 502 });
  }
  let pending = 0;
  let tables: HbtTableInfo[] = category ? dir.tables.filter((t) => t.category === category) : dir.tables;
  if (wantCounts) {
    // Presupuesto de tiempo: cada $count tarda ~1 s en SAP, así que se cuentan solo las tablas que faltan y, al agotar
    // el presupuesto, se responde con lo que haya (pending > 0). El cliente repite la llamada hasta que pending sea 0.
    const deadline = Date.now() + COUNT_BUDGET_MS;
    await mapLimit(tables, 4, async (t) => {
      if (cachedCount(t.entity) !== undefined || Date.now() > deadline) return null;
      return countTable(t.entity);
    });
    tables = tables.map((t) => {
      const c = cachedCount(t.entity);
      return c === undefined ? t : { ...t, count: c };
    });
    pending = tables.filter((t) => t.count === undefined).length;
  } else {
    tables = tables.map((t) => {
      const c = cachedCount(t.entity);
      return c === undefined ? t : { ...t, count: c };
    });
  }
  const categories = HBT_CATEGORIES.map((c) => ({ ...c, tables: dir.tables.filter((t) => t.category === c.id).length }));
  return NextResponse.json({
    success: true,
    source: 'SAP_SERVICE_LAYER',
    writesEnabled: sapWritesEnabled(),
    categories,
    data: tables,
    total: tables.length,
    pending,
    // Tablas del complemento que no son entidades del Service Layer (documento / líneas sin UDO registrado)
    withoutEntity: category ? [] : dir.noEntity,
    timestamp: new Date().toISOString()
  });
}
