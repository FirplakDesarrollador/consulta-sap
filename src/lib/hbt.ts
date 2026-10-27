import { querySapServiceLayer } from '@/lib/sapClient';
import { ISO_DATE, ValidationResult } from '@/lib/purchasing';
import { esc } from '@/lib/items';
import {
  HbtCategoryInfo,
  HbtDocType,
  HbtFieldDef,
  HbtFieldKind,
  HbtMode,
  HbtRecord,
  HbtTableInfo,
  HbtValue
} from '@/types/hbt';

/**
 * Localización HBT (complemento colombiano de SAP B1: retenciones, medios magnéticos, información tributaria,
 * facturación electrónica, municipios, EDI…). El complemento guarda todo en TABLAS DE USUARIO sin objeto
 * (UserTablesMD, tipo bott_NoObject) y en CAMPOS DE USUARIO (U_HBT_*) de socios, retenciones y documentos.
 * No define UDOs: UserObjectsMD no contiene objetos HBT.
 *
 * Operaciones verificadas contra el $metadata (v1, 10.0) y la guía del Service Layer:
 *  - Cada tabla de usuario sin objeto es la entidad U_<TABLA> (clave Code, propiedades Name y U_<campo>):
 *    GET lista/detalle, POST, PATCH y DELETE. `$metadata` tipa todo como Edm.String; los tipos reales salen de UserFieldsMD.
 *  - Campos U_HBT_* de BusinessPartners / WithholdingTaxCodes / documentos: se leen y se modifican con PATCH de la entidad estándar.
 *  - PUT: no se expone (resetea lo no enviado); se enruta a PATCH.
 */

export type SapRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Utilidades Service Layer
// ---------------------------------------------------------------------------

/** Lee todas las páginas de una consulta (página de 200, límite de seguridad `max` filas) */
export async function slAll(entity: string, params: Record<string, string>, max = 3000): Promise<SapRecord[] | null> {
  const out: SapRecord[] = [];
  let skip = 0;
  while (skip < max) {
    const r = await querySapServiceLayer<SapRecord[]>(entity, {
      method: 'GET',
      pageSize: 200,
      params: { ...params, $skip: String(skip) }
    });
    if (!r.success || !Array.isArray(r.data)) return skip === 0 ? null : out;
    out.push(...r.data);
    if (r.data.length === 0 || (!r.nextLink && r.data.length < 200)) break;
    skip += r.data.length;
  }
  return out;
}

/** Ejecuta `fn` sobre `items` con un máximo de `limit` tareas en paralelo */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const day = (v: unknown) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '');

// ---------------------------------------------------------------------------
// Categorías y clasificación de tablas
// ---------------------------------------------------------------------------

export const HBT_PREFIX_RE = /^(HBT|BPCO|HEIN)_/;
const TABLE_NAME_RE = /^(HBT|BPCO|HEIN)_[A-Z0-9_]{1,40}$/;

export const HBT_CATEGORIES: HbtCategoryInfo[] = [
  { id: 'catalogos', label: 'Catálogos tributarios y geográficos', description: 'Municipios, departamentos, regímenes, tipos de documento e impuesto, actividades económicas, monedas y unidades DIAN' },
  { id: 'fe', label: 'Facturación electrónica', description: 'Parámetros, series, campos adicionales, códigos de producto y documentos de recepción' },
  { id: 'retenciones', label: 'Retenciones', description: 'Ajustes de retención, autorretenciones por lote, artículos con retención y certificados' },
  { id: 'mm', label: 'Medios magnéticos', description: 'Formatos, conceptos, cuentas, extracciones y medios magnéticos temporales' },
  { id: 'diferidos', label: 'Diferidos', description: 'Diferidos de compras y ventas y su contabilización' },
  { id: 'legalizaciones', label: 'Legalizaciones y anticipos', description: 'Legalización de gastos y anticipos' },
  { id: 'cartera', label: 'Cartera y cheques', description: 'Gestión de cartera, cheques posfechados y causales' },
  { id: 'edi', label: 'EDI', description: 'Intercambio electrónico de datos: formatos, segmentos, trazas, alistamiento (HBT_EDI* y HEIN_*)' },
  { id: 'facmasiva', label: 'Facturación masiva', description: 'Parámetros de facturación masiva y segmentos de socio' },
  { id: 'sistema', label: 'Sistema y parámetros', description: 'Parámetros globales, tareas programadas, migración, excepciones y bitácoras' }
];

/** Catálogos: se pueden crear, modificar y eliminar */
const CRUD_TABLES = new Set([
  'HBT_REGIMTRIB', 'HBT_TIPODOC', 'HBT_TIPOIMPUESTO', 'HBT_TARIFAIMPUESTO', 'HBT_REGIMENFISCAL', 'HBT_RESPFISCAL',
  'HBT_TIPOREPRESENT', 'HBT_MUNICIPIO', 'HBT_ACTIVIDADECO', 'HBT_UMEDIDASDIAN', 'HBT_PAISESFE', 'HBT_MONEDAS',
  'HBT_REFUNIMEDIDA', 'HBT_CODIGOSPOSTALES', 'BPCO_DEP', 'BPCO_MU', 'BPCO_RT', 'BPCO_TD', 'BPCO_TDS', 'BPCO_AE',
  'BPCO_MM_ACECO', 'BPCO_MM_TIPOING', 'HBT_TARIFA_IVA', 'HBT_CAUDEVCHE', 'HBT_CHEPOSCAU', 'HBT_CENTRALESRIESGO',
  'HBT_GRUPO_SUBGRUPO', 'HBT_AJURETCON', 'HBT_LEGCON', 'HBT_CONCEPTOANTI', 'HBT_CONC_ENTINV', 'HBT_MMCONCEPTO', 'BPCO_MMCO'
]);

/** Parametrización del complemento: CRUD con aviso (un cambio altera el comportamiento del complemento) */
const CONFIG_TABLES = new Set([
  'HBT_FE_ADICIONALCR', 'HBT_FE_ADICIONALFE', 'HBT_FE_ADICIONALFV', 'HBT_FE_ADICIONALGR', 'HBT_FE_ADICIONALNC',
  'HBT_FE_ADICIONALND', 'HBT_MMFORMATO', 'HBT_MMCAMPO', 'HBT_MMFORCAM', 'HBT_MMFORCON', 'HBT_MMCONCTAENC',
  'HBT_MMCONCTADET', 'BPCO_MMFM', 'BPCO_MM_CUST', 'HBT_PARAMGLO', 'HBT_CONDIFEENC', 'HBT_CONDIFEDET', 'HBT_BI_FACTORES',
  'HBT_BI_MODELO', 'HBT_EDIFORMATOS', 'HBT_EDISEGMENTOS', 'HBT_EDISUBSEGMENTOS', 'HBT_EDIVALVALIDOS', 'HBT_EDI_DOCUMENTOS',
  'HBT_EDIWEBMENU', 'HBT_CODPRODUCTOS', 'HBT_CODPRODUCTOSFE', 'HBT_USUSUARIOSERIES', 'HBT_UNIONTEMPORALFE',
  'HBT_PARAMTRANBAN', 'HEIN_PARAMETRIZA', 'HEIN_ASOCIACION', 'HEIN_CAMPOFORMA', 'HEIN_CAMPOSAP', 'HEIN_IDENTREGISTRO'
]);

/** Configuración de una sola fila / series: solo se modifican registros existentes */
const PATCH_TABLES = new Set([
  'HBT_FE_SERIE', 'HBT_FE_SERIE_DSA', 'HBT_FE_SERIE_POS', 'HBT_EDICONFIG', 'HBT_AUTOTASK', 'HBT_CORREOPROCESO', 'HBT_LEGENLASI'
]);

/**
 * Modo de operación de una tabla. Lo que no está en las listas anteriores (registros transaccionales, bitácoras,
 * tablas de trabajo del complemento, HBT_FE_PARAMETRO con credenciales y endpoints) es solo lectura.
 */
export function modeOfTable(name: string): HbtMode {
  if (CRUD_TABLES.has(name)) return 'crud';
  if (CONFIG_TABLES.has(name)) return 'config';
  if (PATCH_TABLES.has(name)) return 'patch';
  return 'readonly';
}

const CATALOG_TABLES = new Set([
  'HBT_REGIMTRIB', 'HBT_TIPODOC', 'HBT_TIPOIMPUESTO', 'HBT_TARIFAIMPUESTO', 'HBT_REGIMENFISCAL', 'HBT_RESPFISCAL',
  'HBT_TIPOREPRESENT', 'HBT_MUNICIPIO', 'HBT_ACTIVIDADECO', 'HBT_UMEDIDASDIAN', 'HBT_PAISESFE', 'HBT_MONEDAS',
  'HBT_REFUNIMEDIDA', 'HBT_CODIGOSPOSTALES', 'HBT_TARIFA_IVA', 'BPCO_DEP', 'BPCO_MU', 'BPCO_RT', 'BPCO_TD', 'BPCO_TDS',
  'BPCO_AE', 'BPCO_MM_ACECO'
]);

export function categoryOfTable(name: string): string {
  if (CATALOG_TABLES.has(name)) return 'catalogos';
  if (/^HBT_(FE_|UNIONTEMPORALFE|CODPRODUCTOS|USUSUARIOSERIES)/.test(name)) return 'fe';
  if (/^(HBT_MM|BPCO_MM|BPCO_PENDIENTE)/.test(name)) return 'mm';
  if (/^(HBT_AJURET|HBT_AUTORET|HBT_EJECAUTOBATCH|HBT_ARTICULORET|HBT_LOGMODFRETE|HBT_CORREOCERTRET)/.test(name)) return 'retenciones';
  if (/^(HBT_DIF|HBT_CONDIFE)/.test(name)) return 'diferidos';
  if (/^(HBT_LEG|HBT_ANTICIPO|HBT_CONCEPTOANTI)/.test(name)) return 'legalizaciones';
  if (/^(HBT_GESTCARTERA|HBT_CHEPOS|HBT_CHEQ|HBT_LOGCHEQUES|HBT_CARTERATMP|HBT_CAUDEVCHE|HBT_CENTRALESRIESGO|HBT_TBPAGORECIBIDO)/.test(name)) return 'cartera';
  if (/^(HBT_EDI|HEIN_)/.test(name)) return 'edi';
  if (/^(HBT_PARFACMAS|BPCO_AFM|HBT_SEGMENTOSOCIO|HBT_VALVALIDOSOCIO)/.test(name)) return 'facmasiva';
  return 'sistema';
}

// ---------------------------------------------------------------------------
// Directorio de tablas (UserTablesMD) y conteos
// ---------------------------------------------------------------------------

const TTL = 10 * 60 * 1000;
let dirCache: { at: number; tables: HbtTableInfo[]; noEntity: { name: string; description: string; type: string }[] } | null = null;
const countCache = new Map<string, { at: number; count: number | null }>();

export async function getTableDirectory() {
  if (dirCache && Date.now() - dirCache.at < TTL) return { tables: dirCache.tables, noEntity: dirCache.noEntity, cached: true };
  const raw = await slAll('UserTablesMD', { $select: 'TableName,TableDescription,TableType' });
  if (!raw) return null;
  const tables: HbtTableInfo[] = [];
  const noEntity: { name: string; description: string; type: string }[] = [];
  for (const t of raw) {
    const name = s(t.TableName);
    if (!HBT_PREFIX_RE.test(name)) continue;
    if (s(t.TableType) !== 'bott_NoObject') {
      // Tablas de documento/líneas de objeto: el Service Layer solo las expone a través de su UDO, que no existe
      noEntity.push({ name, description: s(t.TableDescription), type: s(t.TableType) });
      continue;
    }
    tables.push({
      name,
      description: s(t.TableDescription) || name,
      category: categoryOfTable(name),
      mode: modeOfTable(name),
      entity: `U_${name}`
    });
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));
  dirCache = { at: Date.now(), tables, noEntity };
  return { tables, noEntity, cached: false };
}

export async function findTable(raw: string) {
  const name = (raw || '').toUpperCase();
  if (!TABLE_NAME_RE.test(name)) return null;
  const dir = await getTableDirectory();
  if (!dir) return { error: 'No se pudo consultar el directorio de tablas de usuario (UserTablesMD)' } as const;
  const table = dir.tables.find((t) => t.name === name);
  return table ? ({ table } as const) : null;
}

export async function countTable(entity: string): Promise<number | null> {
  const hit = countCache.get(entity);
  if (hit && Date.now() - hit.at < TTL) return hit.count;
  const r = await querySapServiceLayer<unknown>(`${entity}/$count`, { method: 'GET' });
  const n = r.success ? num(r.data) : null;
  countCache.set(entity, { at: Date.now(), count: n });
  return n;
}

export function rememberCount(entity: string, count: number) {
  countCache.set(entity, { at: Date.now(), count });
}

export function cachedCount(entity: string): number | null | undefined {
  const hit = countCache.get(entity);
  return hit && Date.now() - hit.at < TTL ? hit.count : undefined;
}

// ---------------------------------------------------------------------------
// Definición de campos de usuario (UserFieldsMD)
// ---------------------------------------------------------------------------

/**
 * Campos con credenciales, claves o tokens: nunca se piden al Service Layer, no se muestran y no se aceptan en escrituras.
 * (U_PassConsEcuador, U_PasswordHBT, U_Token, U_HBT_Contrasena, U_ClaveTecnica…) y los usuarios de servicio (U_Usr*, U_Username*).
 */
const SECRET_RE = /(pass|pwd|contrase|token|clavetecnica|secret|^usr[a-z]|^username)/i;
export const isSecretField = (name: string) => SECRET_RE.test(name);

function kindOf(type: string, subType: string): HbtFieldKind {
  switch (type) {
    case 'db_Memo':
      return 'longtext';
    case 'db_Float':
      return 'number';
    case 'db_Numeric':
      return subType === 'st_Time' ? 'time' : 'int';
    case 'db_Date':
      return subType === 'st_Time' ? 'time' : 'date';
    default:
      return 'text';
  }
}

const defsCache = new Map<string, { at: number; defs: HbtFieldDef[]; warnings: string[] }>();

/**
 * Campos de usuario de una tabla. `tableName` es el de UserFieldsMD: "@HBT_MUNICIPIO" para tablas de usuario,
 * "OCRD", "OWHT", "OINV"… para tablas del sistema (con `prefix` se conservan solo los campos U_HBT_*).
 * Los valores válidos se piden en una consulta aparte (junto con el resto de columnas el SL tarda demasiado).
 */
export async function fetchFieldDefs(tableName: string, prefix?: RegExp): Promise<{ defs: HbtFieldDef[]; warnings: string[] } | null> {
  const key = `${tableName}|${prefix?.source ?? ''}`;
  const hit = defsCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit;

  const filter = `TableName eq '${esc(tableName)}'`;
  const raw = await slAll('UserFieldsMD', {
    $filter: filter,
    $select: 'Name,Description,Type,SubType,Size,Mandatory,DefaultValue,LinkedTable,FieldID',
    $orderby: 'FieldID'
  });
  if (!raw) return null;
  const warnings: string[] = [];
  const vv = await slAll('UserFieldsMD', { $filter: filter, $select: 'Name,ValidValuesMD' });
  const validByName = new Map<string, { value: string; label: string }[]>();
  if (vv) {
    for (const r of vv) {
      const list = Array.isArray(r.ValidValuesMD) ? (r.ValidValuesMD as SapRecord[]) : [];
      if (list.length > 0) validByName.set(s(r.Name), list.map((v) => ({ value: s(v.Value), label: s(v.Description) || s(v.Value) })));
    }
  } else {
    warnings.push('No se pudieron leer los valores válidos de los campos; se validarán en SAP');
  }

  const defs: HbtFieldDef[] = raw
    .filter((f) => !prefix || prefix.test(s(f.Name)))
    .map((f) => {
      const name = s(f.Name);
      const kind = kindOf(s(f.Type), s(f.SubType));
      return {
        name,
        sap: `U_${name}`,
        label: s(f.Description) || name,
        kind,
        size: num(f.Size) ?? 0,
        mandatory: f.Mandatory === 'tYES',
        defaultValue: s(f.DefaultValue),
        linkedTable: s(f.LinkedTable),
        validValues: validByName.get(name) ?? [],
        secret: isSecretField(name)
      };
    });
  const entry = { at: Date.now(), defs, warnings };
  defsCache.set(key, entry);
  return entry;
}

export const HBT_UDF_PREFIX = /^hbt_/i;

// ---------------------------------------------------------------------------
// Lectura: mapeo y filtros
// ---------------------------------------------------------------------------

export function readValue(def: HbtFieldDef, raw: unknown): HbtValue {
  if (raw === null || raw === undefined) return null;
  if (def.kind === 'int' || def.kind === 'number' || def.kind === 'time') {
    const n = num(raw);
    return n === null ? s(raw) : n;
  }
  if (def.kind === 'date') {
    const d = day(raw);
    return d || null;
  }
  return typeof raw === 'number' ? raw : String(raw);
}

/** Lista de columnas de $select para los campos no secretos (las memo se excluyen del listado) */
export function selectColumns(defs: HbtFieldDef[], opts: { memo: boolean }): string[] {
  return defs.filter((d) => !d.secret && (opts.memo || d.kind !== 'longtext')).map((d) => d.sap);
}

export function mapFields(defs: HbtFieldDef[], rec: SapRecord): { fields: Record<string, HbtValue>; hidden: string[] } {
  const fields: Record<string, HbtValue> = {};
  for (const d of defs) {
    if (d.secret) continue;
    if (d.sap in rec) fields[d.name] = readValue(d, rec[d.sap]);
  }
  return { fields, hidden: defs.filter((d) => d.secret).map((d) => d.name) };
}

export function mapHbtRecord(defs: HbtFieldDef[], rec: SapRecord): HbtRecord {
  const { fields, hidden } = mapFields(defs, rec);
  return { code: s(rec.Code), name: s(rec.Name), fields, hiddenFields: hidden };
}

/** Condición OData para un campo según su tipo; devuelve null y un error si el valor no es válido */
function eqCondition(def: HbtFieldDef, value: string, errors: string[]): string | null {
  if (def.secret) {
    errors.push(`${def.name}: campo protegido, no se puede filtrar`);
    return null;
  }
  if (def.kind === 'int' || def.kind === 'number' || def.kind === 'time') {
    const n = num(value);
    if (n === null) {
      errors.push(`${def.name}: el filtro debe ser numérico`);
      return null;
    }
    return `${def.sap} eq ${n}`;
  }
  if (def.kind === 'date') {
    if (!ISO_DATE.test(value)) {
      errors.push(`${def.name}: la fecha debe ser AAAA-MM-DD`);
      return null;
    }
    return `${def.sap} eq '${value}'`;
  }
  return `${def.sap} eq '${esc(value)}'`;
}

export function buildTableFilter(
  defs: HbtFieldDef[],
  q: { search: string; prefix: string; fieldFilters: Record<string, string> }
): { filter: string; errors: string[] } {
  const errors: string[] = [];
  const parts: string[] = [];
  if (q.prefix) parts.push(`startswith(Code,'${esc(q.prefix)}')`);
  if (q.search) {
    const t = esc(q.search);
    const searchable = defs.filter((d) => d.kind === 'text' && !d.secret && d.size >= 3).slice(0, 3);
    const ors = [`contains(Code,'${t}')`, `contains(Name,'${t}')`, ...searchable.map((d) => `contains(${d.sap},'${t}')`)];
    parts.push(`(${ors.join(' or ')})`);
  }
  for (const [k, v] of Object.entries(q.fieldFilters)) {
    const def = defs.find((d) => d.name === k);
    if (!def) {
      errors.push(`Campo desconocido para filtrar: ${k}`);
      continue;
    }
    const c = eqCondition(def, v, errors);
    if (c) parts.push(c);
  }
  return { filter: parts.join(' and '), errors };
}

// ---------------------------------------------------------------------------
// Rutas del Service Layer
// ---------------------------------------------------------------------------

/** Clave Code de una tabla de usuario: U_TABLA('código') con comillas escapadas y URL-encode */
export function recordPath(entity: string, code: string): string {
  return `${entity}('${encodeURIComponent(code.replace(/'/g, "''"))}')`;
}

export function entityKeyPath(entity: string, key: string | number): string {
  return typeof key === 'number' ? `${entity}(${key})` : recordPath(entity, key);
}

export function parseHbtCode(raw: string): string | null {
  let code: string;
  try {
    code = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (!code || code.length > 50 || /[\u0000-\u001f]/.test(code)) return null;
  return code;
}

export async function fetchRecordState(entity: string, code: string) {
  const r = await querySapServiceLayer<SapRecord>(recordPath(entity, code), { method: 'GET', params: { $select: 'Code' } });
  return { success: r.success, notFound: !r.success && /HTTP 404/.test(r.error || ''), error: r.error };
}

// ---------------------------------------------------------------------------
// Escritura: validación de campos de usuario
// ---------------------------------------------------------------------------

export interface UdfPayloadOptions {
  create: boolean;
  /** Devuelve un motivo si el campo NO se puede modificar por esta ruta */
  denied?: (def: HbtFieldDef) => string | null;
}

/**
 * Valida `raw` ({ Campo: valor } con o sin prefijo U_) contra las definiciones de UserFieldsMD y arma el cuerpo
 * para el Service Layer ({ U_Campo: valor }). Rechaza campos desconocidos, protegidos o de solo lectura,
 * tipos, tamaños y valores fuera de la lista de valores válidos. No se puede vaciar un campo numérico o de fecha
 * (el Service Layer no documenta null para campos de usuario), solo los de texto.
 */
export function buildUdfPayload(defs: HbtFieldDef[], raw: unknown, opts: UdfPayloadOptions): { payload: SapRecord; errors: string[] } {
  const payload: SapRecord = {};
  const errors: string[] = [];
  if (raw === undefined) return { payload, errors };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('fields: debe ser un objeto { Campo: valor }');
    return { payload, errors };
  }
  const byName = new Map(defs.map((d) => [d.name.toLowerCase(), d]));
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const def = byName.get(k.replace(/^U_/i, '').toLowerCase());
    if (!def) {
      errors.push(`Campo de usuario desconocido: ${k}`);
      continue;
    }
    if (def.secret) {
      errors.push(`${def.name}: campo protegido (credenciales), no se puede leer ni escribir desde esta aplicación`);
      continue;
    }
    const why = opts.denied?.(def);
    if (why) {
      errors.push(`${def.name}: ${why}`);
      continue;
    }
    const label = `${def.label} (${def.name})`;
    if (v === null || v === '' || v === undefined) {
      if (def.kind === 'text' || def.kind === 'longtext') {
        if (def.mandatory) errors.push(`${label}: es obligatorio`);
        else if (!opts.create) payload[def.sap] = '';
      } else if (!opts.create) {
        errors.push(`${label}: no se puede vaciar un campo ${def.kind === 'date' ? 'de fecha' : 'numérico'} por el Service Layer; indique un valor`);
      }
      continue;
    }
    let value: string | number;
    if (def.kind === 'text' || def.kind === 'longtext') {
      if (typeof v !== 'string' && typeof v !== 'number') {
        errors.push(`${label}: debe ser texto`);
        continue;
      }
      value = String(v).trim();
      const max = def.kind === 'longtext' ? 100000 : def.size || 254;
      if (value.length > max) {
        errors.push(`${label}: máximo ${max} caracteres`);
        continue;
      }
    } else if (def.kind === 'date') {
      if (typeof v !== 'string' || !ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) {
        errors.push(`${label}: la fecha debe ser AAAA-MM-DD`);
        continue;
      }
      value = v;
    } else {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      if (!Number.isFinite(n)) {
        errors.push(`${label}: debe ser numérico`);
        continue;
      }
      if (def.kind !== 'number' && !Number.isInteger(n)) {
        errors.push(`${label}: debe ser un entero`);
        continue;
      }
      if (def.kind === 'time' && (n < 0 || n > 2359 || n % 100 > 59)) {
        errors.push(`${label}: la hora debe ser HHMM (0–2359)`);
        continue;
      }
      value = n;
    }
    if (def.validValues.length > 0 && !def.validValues.some((o) => o.value === String(value))) {
      errors.push(`${label}: valor no válido (${def.validValues.map((o) => o.value).join(', ')})`);
      continue;
    }
    payload[def.sap] = value;
  }
  if (opts.create) {
    for (const d of defs) {
      if (d.secret || d.sap in payload) continue;
      const why = opts.denied?.(d);
      if (why) continue;
      if (d.defaultValue !== '' && (d.kind === 'text' || d.kind === 'longtext')) payload[d.sap] = d.defaultValue;
      else if (d.mandatory) errors.push(`${d.label} (${d.name}): es obligatorio`);
    }
  }
  return { payload, errors };
}

const CODE_MAX = 30;
const NAME_MAX = 100;

function topLevelKeys(body: Record<string, unknown>, allowed: string[], errors: string[]) {
  for (const k of Object.keys(body)) if (!allowed.includes(k)) errors.push(`Propiedad no permitida: ${k}`);
}

export function buildRecordCreate(body: unknown, defs: HbtFieldDef[]): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'] };
  const b = body as Record<string, unknown>;
  topLevelKeys(b, ['code', 'name', 'fields'], errors);
  const code = typeof b.code === 'string' ? b.code.trim() : typeof b.code === 'number' ? String(b.code) : '';
  if (!code) errors.push('El código (Code) es obligatorio');
  else if (code.length > CODE_MAX || /[\u0000-\u001f]/.test(code)) errors.push(`El código admite hasta ${CODE_MAX} caracteres sin caracteres de control`);
  const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim() : code;
  if (name.length > NAME_MAX) errors.push(`El nombre (Name) admite hasta ${NAME_MAX} caracteres`);
  const u = buildUdfPayload(defs, b.fields, { create: true });
  errors.push(...u.errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: { Code: code, Name: name, ...u.payload } };
}

export function buildRecordUpdate(body: unknown, defs: HbtFieldDef[]): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'] };
  const b = body as Record<string, unknown>;
  if ('code' in b) errors.push('El código (Code) no se puede modificar');
  topLevelKeys(b, ['code', 'name', 'fields'], errors);
  const payload: SapRecord = {};
  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) errors.push('El nombre (Name) no puede quedar vacío');
    else if (b.name.trim().length > NAME_MAX) errors.push(`El nombre (Name) admite hasta ${NAME_MAX} caracteres`);
    else payload.Name = b.name.trim();
  }
  const u = buildUdfPayload(defs, b.fields, { create: false });
  errors.push(...u.errors);
  Object.assign(payload, u.payload);
  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

/** Cuerpo { fields } para PATCH de campos HBT en entidades estándar (socios, retenciones) */
export function buildFieldsUpdate(body: unknown, defs: HbtFieldDef[], denied?: UdfPayloadOptions['denied']): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'] };
  const b = body as Record<string, unknown>;
  topLevelKeys(b, ['fields'], errors);
  const u = buildUdfPayload(defs, b.fields, { create: false, denied });
  errors.push(...u.errors);
  if (errors.length === 0 && Object.keys(u.payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: u.payload };
}

// ---------------------------------------------------------------------------
// Socios de negocio (OCRD): campos U_HBT_*
// ---------------------------------------------------------------------------

/** Banderas que escribe el propio complemento (procesos de sincronización): solo lectura */
const PARTNER_READONLY = new Set(['HBT_TareaSN_TPV', 'HBT_ActualizaMP']);
export const partnerDenied = (d: HbtFieldDef): string | null =>
  PARTNER_READONLY.has(d.name) ? 'bandera de proceso que mantiene el complemento HBT; solo lectura' : null;

export const PARTNER_LIST_FIELDS = ['HBT_RegTrib', 'HBT_TipDoc', 'HBT_MunMed', 'HBT_TipEnt', 'HBT_AutRet', 'HBT_InfoTrib', 'HBT_ConsumFinal', 'HBT_AplicaFel', 'HBT_MailRecep_FE'];
export const PARTNER_FILTER_FIELDS = ['HBT_RegTrib', 'HBT_TipDoc', 'HBT_TipEnt', 'HBT_AutRet', 'HBT_InfoTrib', 'HBT_ConsumFinal', 'HBT_AplicaFel'];

export function partnerPath(code: string) {
  return recordPath('BusinessPartners', code);
}

// ---------------------------------------------------------------------------
// Retenciones (OWHT)
// ---------------------------------------------------------------------------

export const WTAX_LIST_SELECT = ['WTCode', 'WTName', 'Category', 'BaseType', 'BaseAmount', 'Rate', 'OfficialCode', 'Account', 'WithholdingType', 'EffectiveFrom', 'Inactive'];

export function withholdingPath(code: string) {
  return recordPath('WithholdingTaxCodes', code);
}

// ---------------------------------------------------------------------------
// Facturación electrónica (campos U_HBT_* de documentos)
// ---------------------------------------------------------------------------

export const HBT_DOC_TYPES: Record<HbtDocType, { entity: string; table: string; label: string }> = {
  invoices: { entity: 'Invoices', table: 'OINV', label: 'Facturas de venta' },
  'credit-notes': { entity: 'CreditNotes', table: 'ORIN', label: 'Notas crédito de venta' },
  'purchase-invoices': { entity: 'PurchaseInvoices', table: 'OPCH', label: 'Facturas de compra' },
  'purchase-credit-notes': { entity: 'PurchaseCreditNotes', table: 'ORPC', label: 'Notas crédito de compra' },
  'delivery-notes': { entity: 'DeliveryNotes', table: 'ODLN', label: 'Entregas' }
};

export function parseDocType(raw: string | null): HbtDocType | null {
  return raw && raw in HBT_DOC_TYPES ? (raw as HbtDocType) : null;
}

/** U_HBT_EstadoCE: valores válidos definidos en UserFieldsMD (OINV) */
export const EINV_STATUS: Record<number, string> = { 1: 'Pendiente', 2: 'Generado', 3: 'Enviado', 4: 'Aprobado', 5: 'Rechazado' };
export const EINV_DIAN: Record<number, string> = { 0: 'No definido', 1: 'Entregado (Delivered)', 2: 'Validado (Validated)', 3: 'Revocado (Revoke)' };
export const EINV_DELIVERY: Record<number, string> = { 0: 'No definido', 1: 'Enviado (Sent)', 2: 'Recibido (Acknowledged)', 3: 'Rechazado (Rejected)', 4: 'Aceptado (Accepted)' };

export const EINV_LIST_SELECT = [
  'DocEntry', 'DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocCurrency', 'Cancelled',
  'U_HBT_EstadoCE', 'U_HBT_DetalleEstado', 'U_HBT_FechaEnvCE', 'U_HBT_FechaAceCE', 'U_HBT_ResCodigo',
  'U_HBT_EstadoDIAN', 'U_HBT_EstadoEntrega', 'U_HBT_TipoFactura', 'U_HBT_Tipo_Operacion'
];

export function mapEInvoiceRow(o: SapRecord) {
  const status = num(o.U_HBT_EstadoCE);
  return {
    docEntry: num(o.DocEntry) ?? 0,
    docNum: num(o.DocNum) ?? 0,
    docDate: day(o.DocDate),
    cardCode: s(o.CardCode),
    cardName: s(o.CardName),
    docTotal: num(o.DocTotal) ?? 0,
    currency: s(o.DocCurrency),
    cancelled: o.Cancelled === 'tYES',
    statusCode: status,
    statusLabel: status === null ? 'Sin estado' : (EINV_STATUS[status] ?? `Estado ${status}`),
    statusDetail: s(o.U_HBT_DetalleEstado),
    sentDate: day(o.U_HBT_FechaEnvCE),
    answerDate: day(o.U_HBT_FechaAceCE),
    responseCode: s(o.U_HBT_ResCodigo),
    dianCode: num(o.U_HBT_EstadoDIAN),
    deliveryCode: num(o.U_HBT_EstadoEntrega),
    invoiceType: s(o.U_HBT_TipoFactura),
    operationType: s(o.U_HBT_Tipo_Operacion)
  };
}

// ---------------------------------------------------------------------------
// Rutas de socios y retenciones: consulta común
// ---------------------------------------------------------------------------

/** Filtros f.<Campo>=<valor> de la query → condiciones OData sobre los campos permitidos */
export function collectFieldFilters(sp: URLSearchParams, allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of sp.entries()) {
    if (k.startsWith('f.') && v.trim() && allowed.includes(k.slice(2))) out[k.slice(2)] = v.trim().slice(0, 100);
  }
  return out;
}

/** Condiciones de igualdad para varios campos de usuario (usa las mismas reglas de tipo que las tablas de usuario) */
export function fieldFilterConditions(defs: HbtFieldDef[], fieldFilters: Record<string, string>) {
  return buildTableFilter(defs, { search: '', prefix: '', fieldFilters });
}

/** Mapea un registro de entidad estándar (socio, retención) a sus campos HBT */
export function pickHbtFields(defs: HbtFieldDef[], rec: SapRecord) {
  return mapFields(defs, rec);
}
