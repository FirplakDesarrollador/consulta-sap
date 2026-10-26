import { querySapServiceLayer } from '@/lib/sapClient';
import { ISO_DATE, ValidationResult } from '@/lib/purchasing';
import {
  InvDocDetail,
  InvDocKind,
  InvDocLine,
  InvDocRow,
  InvDocSource,
  InvHeaderKey,
  InvStatus
} from '@/types/inventory';

/**
 * Módulo Inventarios sobre SAP Business One Service Layer (/b1s/v1, OData v3).
 *
 * Operaciones verificadas contra $metadata del SL de Firplak:
 *  - InventoryGenEntries / InventoryGenExits → SAPB1.Document. Acciones enlazables: Cancel, Close, Reopen,
 *    CreateCancellationDocument. Borradores en Drafts (DocObjectCode oInventoryGenEntry / oInventoryGenExit).
 *  - StockTransfers / InventoryTransferRequests / StockTransferDrafts → SAPB1.StockTransfer.
 *    Acciones enlazables: Cancel, Close, SaveDraftToDocument (borradores). Los borradores de traslado
 *    tienen DocObjectCode "67" y los de solicitud "1250000001".
 *  - InventoryCountings → SAPB1.InventoryCounting. Acción enlazable: Close. El DI API
 *    (InventoryCountingsService) solo expone Add, Get, GetList, Update y Close: no hay borrado.
 *  - InventoryPostings → SAPB1.InventoryPosting. Sin acciones enlazables. El DI API
 *    (InventoryPostingsService) solo expone Add, Get, GetList, Update: no hay cancelación ni borrado.
 *  - DELETE sobre documentos: no soportado (SL guía §3.4.4, error -5006). Solo los borradores admiten DELETE.
 *  - PUT del SL reemplaza la entidad completa; en esta API PUT se enruta a PATCH.
 */

export type HeaderSapMap = Partial<Record<InvHeaderKey, string>>;
type LineMode = 'gen' | 'transfer' | 'counting' | 'posting';
type StatusModel = 'document' | 'transfer' | 'counting' | 'posting';

export interface InvDocConfig {
  kind: InvDocKind;
  entity: string;
  table: string;
  idPrefix: string;
  label: string;
  keyField: 'DocEntry' | 'DocumentEntry';
  numField: 'DocNum' | 'DocumentNumber';
  dateField: 'DocDate' | 'CountDate' | 'PostingDate';
  linesField: 'DocumentLines' | 'StockTransferLines' | 'InventoryCountingLines' | 'InventoryPostingLines';
  lineKey: 'LineNum' | 'LineNumber';
  statusModel: StatusModel;
  lineMode: LineMode;
  /** Cabecera aceptada al crear (clave neutra → campo SAP) */
  header: HeaderSapMap;
  /** Cabecera modificable con PATCH en documentos (no borradores) abiertos */
  updatableHeader: InvHeaderKey[];
  /** Si las líneas de documentos (no borradores) abiertos se pueden modificar / agregar con PATCH */
  updatableLines: boolean;
  drafts: { entity: 'Drafts' | 'StockTransferDrafts'; objectCode: string } | null;
  actions: { cancel: boolean; close: boolean };
  listSelect: string;
  textSearchFields: string[];
}

const DOC_HEADER: HeaderSapMap = {
  date: 'DocDate',
  comments: 'Comments',
  reference2: 'Reference2',
  journalMemo: 'JournalMemo'
};

export const INV_DOC_CONFIG: Record<InvDocKind, InvDocConfig> = {
  'goods-entries': {
    kind: 'goods-entries',
    entity: 'InventoryGenEntries',
    table: 'OIGN',
    idPrefix: 'EI',
    label: 'Entrada de Inventario',
    keyField: 'DocEntry',
    numField: 'DocNum',
    dateField: 'DocDate',
    linesField: 'DocumentLines',
    lineKey: 'LineNum',
    statusModel: 'document',
    lineMode: 'gen',
    header: DOC_HEADER,
    updatableHeader: ['comments', 'reference2', 'journalMemo'],
    updatableLines: false,
    drafts: { entity: 'Drafts', objectCode: 'oInventoryGenEntry' },
    // Se crean ya contabilizadas: no tienen cantidades abiertas, por eso no se ofrece Close/Reopen.
    actions: { cancel: true, close: false },
    listSelect: 'DocEntry,DocNum,DocDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,Comments,Reference2,JournalMemo',
    textSearchFields: ['Comments', 'Reference2', 'JournalMemo']
  },
  'goods-exits': {
    kind: 'goods-exits',
    entity: 'InventoryGenExits',
    table: 'OIGE',
    idPrefix: 'SI',
    label: 'Salida de Inventario',
    keyField: 'DocEntry',
    numField: 'DocNum',
    dateField: 'DocDate',
    linesField: 'DocumentLines',
    lineKey: 'LineNum',
    statusModel: 'document',
    lineMode: 'gen',
    header: DOC_HEADER,
    updatableHeader: ['comments', 'reference2', 'journalMemo'],
    updatableLines: false,
    drafts: { entity: 'Drafts', objectCode: 'oInventoryGenExit' },
    actions: { cancel: true, close: false },
    listSelect: 'DocEntry,DocNum,DocDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,Comments,Reference2,JournalMemo',
    textSearchFields: ['Comments', 'Reference2', 'JournalMemo']
  },
  transfers: {
    kind: 'transfers',
    entity: 'StockTransfers',
    table: 'OWTR',
    idPrefix: 'TR',
    label: 'Traslado de Inventario',
    keyField: 'DocEntry',
    numField: 'DocNum',
    dateField: 'DocDate',
    linesField: 'StockTransferLines',
    lineKey: 'LineNum',
    statusModel: 'transfer',
    lineMode: 'transfer',
    header: { ...DOC_HEADER, fromWarehouse: 'FromWarehouse', toWarehouse: 'ToWarehouse' },
    updatableHeader: ['comments', 'reference2', 'journalMemo'],
    updatableLines: false,
    drafts: { entity: 'StockTransferDrafts', objectCode: '67' },
    actions: { cancel: true, close: false },
    listSelect: 'DocEntry,DocNum,DocDate,DueDate,CardName,FromWarehouse,ToWarehouse,DocumentStatus,Comments,Reference2,JournalMemo',
    textSearchFields: ['Comments', 'Reference2', 'CardName', 'FromWarehouse', 'ToWarehouse']
  },
  'transfer-requests': {
    kind: 'transfer-requests',
    entity: 'InventoryTransferRequests',
    table: 'OWTQ',
    idPrefix: 'ST',
    label: 'Solicitud de Traslado',
    keyField: 'DocEntry',
    numField: 'DocNum',
    dateField: 'DocDate',
    linesField: 'StockTransferLines',
    lineKey: 'LineNum',
    statusModel: 'transfer',
    lineMode: 'transfer',
    header: { ...DOC_HEADER, dueDate: 'DueDate', fromWarehouse: 'FromWarehouse', toWarehouse: 'ToWarehouse' },
    updatableHeader: ['comments', 'reference2', 'journalMemo', 'dueDate'],
    updatableLines: true,
    drafts: { entity: 'StockTransferDrafts', objectCode: '1250000001' },
    actions: { cancel: true, close: true },
    listSelect: 'DocEntry,DocNum,DocDate,DueDate,CardName,FromWarehouse,ToWarehouse,DocumentStatus,Comments,Reference2,JournalMemo',
    textSearchFields: ['Comments', 'Reference2', 'CardName', 'FromWarehouse', 'ToWarehouse']
  },
  countings: {
    kind: 'countings',
    entity: 'InventoryCountings',
    table: 'OINC',
    idPrefix: 'RC',
    label: 'Recuento de Inventario',
    keyField: 'DocumentEntry',
    numField: 'DocumentNumber',
    dateField: 'CountDate',
    linesField: 'InventoryCountingLines',
    lineKey: 'LineNumber',
    statusModel: 'counting',
    lineMode: 'counting',
    header: { date: 'CountDate', comments: 'Remarks', reference2: 'Reference2' },
    updatableHeader: ['comments', 'reference2'],
    updatableLines: true,
    drafts: null,
    actions: { cancel: false, close: true },
    listSelect: 'DocumentEntry,DocumentNumber,CountDate,DocumentStatus,Remarks,Reference2,CountingType',
    textSearchFields: ['Remarks', 'Reference2']
  },
  postings: {
    kind: 'postings',
    entity: 'InventoryPostings',
    table: 'OIQR',
    idPrefix: 'CI',
    label: 'Contabilización de Stock',
    keyField: 'DocumentEntry',
    numField: 'DocumentNumber',
    dateField: 'PostingDate',
    linesField: 'InventoryPostingLines',
    lineKey: 'LineNumber',
    statusModel: 'posting',
    lineMode: 'posting',
    header: { date: 'PostingDate', comments: 'Remarks', reference2: 'Reference2', journalMemo: 'JournalRemark', priceSource: 'PriceSource' },
    updatableHeader: ['comments', 'reference2', 'journalMemo'],
    updatableLines: false,
    drafts: null,
    actions: { cancel: false, close: false },
    listSelect: 'DocumentEntry,DocumentNumber,PostingDate,Remarks,Reference2,JournalRemark,PriceSource',
    textSearchFields: ['Remarks', 'Reference2', 'JournalRemark']
  }
};

/** BaseType de una línea de traslado basada en una solicitud (InvBaseDocTypeEnum) */
export const BASE_TYPE_TRANSFER_REQUEST = 'InventoryTransferRequest';
/** ObjectType del recuento de inventario (OINC) usado como base de una contabilización */
export const BASE_TYPE_COUNTING = 1470000065;
export const PRICE_SOURCES = ['ippsByPriceList', 'ippsLastEvaluatedPrice', 'ippsItemCost'] as const;

export function getInvConfig(kind: string): InvDocConfig | null {
  return (INV_DOC_CONFIG as Record<string, InvDocConfig>)[kind] || null;
}

export function parseInvSource(cfg: InvDocConfig, raw: string | null): InvDocSource {
  return raw === 'drafts' && cfg.drafts ? 'drafts' : 'documents';
}

export function entitySetFor(cfg: InvDocConfig, source: InvDocSource): string {
  return source === 'drafts' && cfg.drafts ? cfg.drafts.entity : cfg.entity;
}

export function draftFilter(cfg: InvDocConfig): string | undefined {
  return cfg.drafts ? `DocObjectCode eq '${cfg.drafts.objectCode}'` : undefined;
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export type SapRecord = Record<string, unknown>;

export function mapInvStatus(cfg: InvDocConfig, source: InvDocSource, o: SapRecord): InvStatus {
  if (source === 'drafts' || cfg.statusModel === 'document' || cfg.statusModel === 'transfer') {
    if (o.Cancelled === 'tYES') return 'Cancelado';
    return o.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto';
  }
  if (cfg.statusModel === 'counting') return o.DocumentStatus === 'cdsClosed' ? 'Cerrado' : 'Abierto';
  return 'Contabilizado';
}

/** Filtro OData por estado (null si el estado no aplica a este objeto) */
export function statusFilter(cfg: InvDocConfig, source: InvDocSource, status: string | null): string | null {
  if (!status) return null;
  if (cfg.statusModel === 'counting' && source === 'documents') {
    if (status === 'Abierto') return `DocumentStatus eq 'cdsOpen'`;
    if (status === 'Cerrado') return `DocumentStatus eq 'cdsClosed'`;
    return null;
  }
  if (cfg.statusModel === 'posting' && source === 'documents') return null;
  const hasCancelled = cfg.statusModel === 'document' || (source === 'drafts' && cfg.drafts?.entity === 'Drafts');
  if (status === 'Abierto') return `DocumentStatus eq 'bost_Open'${hasCancelled ? ` and Cancelled eq 'tNO'` : ''}`;
  if (status === 'Cerrado') return `DocumentStatus eq 'bost_Close'${hasCancelled ? ` and Cancelled eq 'tNO'` : ''}`;
  if (status === 'Cancelado' && hasCancelled) return `Cancelled eq 'tYES'`;
  return null;
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const CODE_RE = /^[A-Za-z0-9._\-\/ ]{1,50}$/;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function vDate(v: unknown, field: string, errors: string[]): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!ISO_DATE.test(s) || Number.isNaN(Date.parse(s))) {
    errors.push(`${field}: fecha inválida (use AAAA-MM-DD)`);
    return undefined;
  }
  return s;
}

function vText(v: unknown, field: string, max: number, errors: string[]): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') {
    errors.push(`${field}: debe ser texto`);
    return undefined;
  }
  if (v.length > max) {
    errors.push(`${field}: máximo ${max} caracteres`);
    return undefined;
  }
  return v;
}

function vCode(v: unknown, field: string, max: number, errors: string[]): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!CODE_RE.test(s) || s.length > max) {
    errors.push(`${field}: código inválido`);
    return undefined;
  }
  return s;
}

const TEXT_LIMITS: Partial<Record<InvHeaderKey, number>> = {
  comments: 254,
  reference2: 11,
  journalMemo: 50
};

const HEADER_LABEL: Record<InvHeaderKey, string> = {
  date: 'Fecha',
  dueDate: 'Fecha requerida',
  comments: 'Comentarios',
  reference2: 'Referencia 2',
  journalMemo: 'Comentario asiento',
  fromWarehouse: 'Almacén origen',
  toWarehouse: 'Almacén destino',
  priceSource: 'Fuente de precio'
};

function headerValue(key: InvHeaderKey, raw: unknown, errors: string[]): string | undefined {
  const label = HEADER_LABEL[key];
  if (key === 'date' || key === 'dueDate') return vDate(raw, label, errors);
  if (key === 'fromWarehouse' || key === 'toWarehouse') return vCode(raw, label, 8, errors);
  if (key === 'priceSource') {
    const s = str(raw);
    if (!s) return undefined;
    if (!(PRICE_SOURCES as readonly string[]).includes(s)) {
      errors.push(`${label}: valor no permitido`);
      return undefined;
    }
    return s;
  }
  return vText(raw, label, TEXT_LIMITS[key] ?? 254, errors);
}

interface LineOpts {
  creating: boolean; // documento nuevo
  isDraft: boolean;
  defaults: { fromWarehouse?: string; toWarehouse?: string };
}

function buildLine(cfg: InvDocConfig, raw: unknown, idx: number, errors: string[], opts: LineOpts): SapRecord | null {
  const label = `Línea ${idx + 1}`;
  if (!raw || typeof raw !== 'object') {
    errors.push(`${label}: formato inválido`);
    return null;
  }
  const l = raw as Record<string, unknown>;
  const out: SapRecord = {};

  const lineNum = num(l.lineNum);
  const isExisting = !opts.creating && lineNum !== null;
  if (isExisting) {
    if (!Number.isInteger(lineNum) || (lineNum as number) < 0) errors.push(`${label}: número de línea inválido`);
    out[cfg.lineKey] = lineNum;
  }

  // Documento base
  const baseEntry = num(l.baseEntry);
  const baseLine = num(l.baseLine);
  const hasBase = baseEntry !== null || baseLine !== null;
  if (hasBase) {
    const baseAllowed = opts.creating && (cfg.kind === 'transfers' || cfg.kind === 'postings');
    if (!baseAllowed) errors.push(`${label}: no se permite documento base aquí`);
    else if (!Number.isInteger(baseEntry) || !Number.isInteger(baseLine) || (baseEntry as number) <= 0 || (baseLine as number) < 0) {
      errors.push(`${label}: BaseEntry / BaseLine inválidos`);
    } else {
      out.BaseType = cfg.kind === 'transfers' ? BASE_TYPE_TRANSFER_REQUEST : BASE_TYPE_COUNTING;
      out.BaseEntry = baseEntry;
      out.BaseLine = baseLine;
    }
  }

  const itemCode = vCode(l.itemCode, `${label}: Artículo`, 50, errors);
  if (!isExisting) {
    if (itemCode) out.ItemCode = itemCode;
    else if (!hasBase || cfg.kind === 'postings') errors.push(`${label}: el artículo es obligatorio`);
  }

  const whs = vCode(l.warehouseCode, `${label}: Almacén`, 8, errors);
  const remarks = vText(l.remarks, `${label}: Comentario`, 254, errors);

  if (cfg.lineMode === 'gen' || cfg.lineMode === 'transfer') {
    const quantity = num(l.quantity);
    if (quantity === null) {
      if (!isExisting) errors.push(`${label}: la cantidad es obligatoria`);
    } else if (quantity <= 0) errors.push(`${label}: la cantidad debe ser mayor que 0`);
    else out.Quantity = quantity;
  }

  if (cfg.lineMode === 'gen') {
    if (whs) out.WarehouseCode = whs;
    const price = num(l.price);
    if (price !== null) {
      if (price < 0) errors.push(`${label}: el precio no puede ser negativo`);
      else out.UnitPrice = price;
    }
    const acct = vCode(l.accountCode, `${label}: Cuenta contable`, 15, errors);
    if (acct) out.AccountCode = acct;
  } else if (cfg.lineMode === 'transfer') {
    const from = vCode(l.fromWarehouseCode, `${label}: Almacén origen`, 8, errors) || (isExisting ? undefined : opts.defaults.fromWarehouse);
    const to = whs || (isExisting ? undefined : opts.defaults.toWarehouse);
    if (from) out.FromWarehouseCode = from;
    if (to) out.WarehouseCode = to;
    if (from && to && from === to) errors.push(`${label}: el almacén origen y destino no pueden ser iguales`);
  } else if (cfg.lineMode === 'counting') {
    if (!isExisting) {
      if (!whs) errors.push(`${label}: el almacén es obligatorio`);
      else out.WarehouseCode = whs;
    }
    const counted = num(l.countedQuantity);
    if (counted !== null) {
      if (counted < 0) errors.push(`${label}: la cantidad contada no puede ser negativa`);
      else {
        out.CountedQuantity = counted;
        out.Counted = 'tYES';
      }
    }
    if (remarks !== undefined) out.Remarks = remarks;
  } else if (cfg.lineMode === 'posting') {
    if (!whs) errors.push(`${label}: el almacén es obligatorio`);
    else out.WarehouseCode = whs;
    const counted = num(l.countedQuantity);
    if (counted === null) errors.push(`${label}: la cantidad contada es obligatoria`);
    else if (counted < 0) errors.push(`${label}: la cantidad contada no puede ser negativa`);
    else out.CountedQuantity = counted;
    const price = num(l.price);
    if (price !== null) {
      if (price < 0) errors.push(`${label}: el precio no puede ser negativo`);
      else out.Price = price;
    }
    if (remarks !== undefined) out.Remarks = remarks;
  }

  if (isExisting && Object.keys(out).length === 1) return null; // línea existente sin cambios
  return out;
}

const KNOWN_LINE_KEYS = new Set([
  'lineNum',
  'itemCode',
  'quantity',
  'price',
  'warehouseCode',
  'fromWarehouseCode',
  'accountCode',
  'baseEntry',
  'baseLine',
  'countedQuantity',
  'remarks'
]);

function buildLines(cfg: InvDocConfig, rawLines: unknown, errors: string[], opts: LineOpts): SapRecord[] {
  if (!Array.isArray(rawLines)) {
    errors.push('lines debe ser una lista');
    return [];
  }
  if (rawLines.length > 500) errors.push('Máximo 500 líneas por documento');
  rawLines.forEach((l, i) => {
    if (l && typeof l === 'object') {
      for (const k of Object.keys(l)) if (!KNOWN_LINE_KEYS.has(k)) errors.push(`Línea ${i + 1}: campo no permitido ${k}`);
    }
  });
  return rawLines.map((l, i) => buildLine(cfg, l, i, errors, opts)).filter((x): x is SapRecord => Boolean(x));
}

/** Construye el payload de creación (documento o borrador) */
export function buildInvCreatePayload(
  cfg: InvDocConfig,
  body: unknown
): ValidationResult<{ payload: SapRecord; asDraft: boolean }> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;

  const asDraft = b.asDraft === true;
  if (asDraft && !cfg.drafts) errors.push(`${cfg.label}: el Service Layer no maneja borradores para este objeto`);

  const known = new Set<string>([...Object.keys(cfg.header), 'lines', 'asDraft']);
  for (const k of Object.keys(b)) if (!known.has(k)) errors.push(`Campo no permitido: ${k}`);

  const payload: SapRecord = {};
  const header: Partial<Record<InvHeaderKey, string>> = {};
  for (const [key, sapField] of Object.entries(cfg.header) as [InvHeaderKey, string][]) {
    if (!(key in b)) continue;
    const v = headerValue(key, b[key], errors);
    if (v !== undefined && v !== '') {
      payload[sapField] = v;
      header[key] = v;
    }
  }

  if (cfg.lineMode === 'transfer') {
    if (!header.fromWarehouse) errors.push('El almacén origen es obligatorio');
    if (!header.toWarehouse) errors.push('El almacén destino es obligatorio');
    if (header.fromWarehouse && header.fromWarehouse === header.toWarehouse) errors.push('El almacén origen y destino no pueden ser iguales');
  }
  if (header.date && header.dueDate && header.dueDate < header.date) errors.push('La fecha requerida no puede ser anterior a la fecha del documento');

  if (!Array.isArray(b.lines) || b.lines.length === 0) errors.push('Debe incluir al menos una línea');
  const lines = Array.isArray(b.lines)
    ? buildLines(cfg, b.lines, errors, {
        creating: true,
        isDraft: asDraft,
        defaults: { fromWarehouse: header.fromWarehouse, toWarehouse: header.toWarehouse }
      })
    : [];

  if (errors.length > 0) return { ok: false, errors };
  if (asDraft && cfg.drafts) payload.DocObjectCode = cfg.drafts.objectCode;
  payload[cfg.linesField] = lines;
  return { ok: true, errors: [], value: { payload, asDraft } };
}

/** Construye el payload de actualización (PATCH) */
export function buildInvUpdatePayload(
  cfg: InvDocConfig,
  source: InvDocSource,
  body: unknown
): ValidationResult<SapRecord> {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Cuerpo de la petición inválido'] };
  const b = body as Record<string, unknown>;
  const isDraft = source === 'drafts';

  const allowedHeader: InvHeaderKey[] = isDraft ? (Object.keys(cfg.header) as InvHeaderKey[]) : cfg.updatableHeader;
  const allowLines = isDraft || cfg.updatableLines;

  const payload: SapRecord = {};
  for (const k of Object.keys(b)) {
    if (k === 'lines') continue;
    const key = k as InvHeaderKey;
    const sapField = cfg.header[key];
    if (!sapField) {
      errors.push(`Campo no permitido: ${k}`);
      continue;
    }
    if (!allowedHeader.includes(key)) {
      errors.push(`${HEADER_LABEL[key]} no se puede modificar en este documento`);
      continue;
    }
    const v = headerValue(key, b[k], errors);
    if (v !== undefined) payload[sapField] = v;
  }

  if ('lines' in b) {
    if (!allowLines) errors.push('Las líneas de este documento no se pueden modificar en SAP');
    else {
      const lines = buildLines(cfg, b.lines, errors, { creating: false, isDraft, defaults: {} });
      if (lines.length > 0) payload[cfg.linesField] = lines;
    }
  }

  if (errors.length === 0 && Object.keys(payload).length === 0) errors.push('No hay cambios para enviar');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], value: payload };
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

const day = (d: unknown) => (d ? String(d).slice(0, 10) : '');
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: unknown) => Number(v) || 0;
const nOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const currencyLabel = (c: unknown) => (c === '$' || !c ? 'COP' : String(c));

export function docKey(cfg: InvDocConfig, source: InvDocSource, o: SapRecord): number {
  return Number(source === 'drafts' ? o.DocEntry : o[cfg.keyField]);
}

export function mapInvRow(cfg: InvDocConfig, source: InvDocSource, o: SapRecord): InvDocRow {
  const entry = docKey(cfg, source, o);
  const isDocLike = source === 'drafts' || cfg.statusModel === 'document' || cfg.statusModel === 'transfer';
  return {
    id: `${source === 'drafts' ? 'DRF' : cfg.idPrefix}-${entry}`,
    docEntry: entry,
    docNum: s(source === 'drafts' ? o.DocNum ?? entry : o[cfg.numField] ?? entry),
    date: day(source === 'drafts' ? o.DocDate : o[cfg.dateField]),
    dueDate: day(o.DueDate),
    status: mapInvStatus(cfg, source, o),
    comments: s(isDocLike ? o.Comments : o.Remarks),
    reference2: s(o.Reference2),
    journalMemo: s(isDocLike ? o.JournalMemo : o.JournalRemark),
    fromWarehouse: s(o.FromWarehouse),
    toWarehouse: s(o.ToWarehouse),
    cardName: s(o.CardName),
    docTotal: o.DocTotal === undefined || o.DocTotal === null ? null : n(o.DocTotal),
    currency: currencyLabel(o.DocCurrency)
  };
}

function mapLine(cfg: InvDocConfig, l: SapRecord): InvDocLine {
  const quantity = n(l.Quantity ?? l.CountedQuantity);
  const isCounting = cfg.lineMode === 'counting' || cfg.lineMode === 'posting';
  return {
    lineNum: Number(l[cfg.lineKey] ?? l.LineNum ?? 0),
    itemCode: s(l.ItemCode),
    description: s(l.ItemDescription),
    quantity,
    openQuantity: l.RemainingOpenQuantity === undefined || l.RemainingOpenQuantity === null ? null : n(l.RemainingOpenQuantity),
    price: n(l.UnitPrice ?? l.Price),
    lineTotal: n(l.LineTotal ?? l.Total),
    warehouseCode: s(l.WarehouseCode),
    fromWarehouseCode: s(l.FromWarehouseCode),
    accountCode: s(l.AccountCode),
    uom: s(l.MeasureUnit || l.UoMCode) || 'UN',
    lineStatus: l.LineStatus === 'bost_Close' || l.LineStatus === 'clsClosed' ? 'Cerrada' : 'Abierta',
    baseType: (l.BaseType as string | number | null | undefined) ?? null,
    baseEntry: nOrNull(l.BaseEntry),
    baseLine: nOrNull(l.BaseLine),
    inWarehouseQuantity: isCounting ? nOrNull(l.InWarehouseQuantity) : null,
    countedQuantity: isCounting ? nOrNull(l.CountedQuantity) : null,
    counted: cfg.lineMode === 'counting' ? l.Counted === 'tYES' : null,
    variance: isCounting ? nOrNull(l.Variance) : null,
    remarks: s(l.Remarks)
  };
}

export function mapInvDetail(cfg: InvDocConfig, source: InvDocSource, o: SapRecord): InvDocDetail {
  const row = mapInvRow(cfg, source, o);
  const isDraft = source === 'drafts';
  const linesRaw = (o[cfg.linesField] ?? o.DocumentLines) as SapRecord[] | undefined;
  const lines = Array.isArray(linesRaw) ? linesRaw.map((l) => mapLine(cfg, l)) : [];
  const open = row.status === 'Abierto' || row.status === 'Contabilizado';

  const editableHeader: InvHeaderKey[] = !open
    ? []
    : isDraft
      ? (Object.keys(cfg.header) as InvHeaderKey[])
      : cfg.updatableHeader;

  return {
    kind: cfg.kind,
    source,
    docEntry: row.docEntry,
    docNum: row.docNum,
    date: row.date,
    dueDate: row.dueDate,
    status: row.status,
    comments: row.comments,
    reference2: row.reference2,
    journalMemo: row.journalMemo,
    fromWarehouse: row.fromWarehouse,
    toWarehouse: row.toWarehouse,
    cardCode: s(o.CardCode),
    cardName: row.cardName,
    docTotal: row.docTotal,
    currency: row.currency,
    priceSource: s(o.PriceSource),
    countingType: s(o.CountingType),
    lines,
    editableHeader,
    allowed: {
      update: editableHeader.length > 0,
      updateLines: open && (isDraft || cfg.updatableLines),
      cancel: !isDraft && row.status === 'Abierto' && cfg.actions.cancel,
      close: !isDraft && row.status === 'Abierto' && cfg.actions.close,
      delete: isDraft,
      saveDraftToDocument: isDraft && row.status === 'Abierto'
    }
  };
}

/** Busca por clave y, si no existe, por número de documento (solo lectura) */
export async function fetchInvDoc(cfg: InvDocConfig, source: InvDocSource, id: number, byNum = false) {
  const entitySet = entitySetFor(cfg, source);
  const extra = source === 'drafts' ? draftFilter(cfg) : undefined;
  if (!byNum) {
    const r = await querySapServiceLayer<SapRecord>(`${entitySet}(${id})`, { method: 'GET' });
    if (r.success && r.data && (!extra || r.data.DocObjectCode === cfg.drafts?.objectCode)) {
      return { success: true as const, data: r.data };
    }
  }
  const numField = source === 'drafts' ? 'DocNum' : cfg.numField;
  const list = await querySapServiceLayer<SapRecord[]>(entitySet, {
    method: 'GET',
    params: { '$filter': `${numField} eq ${id}${extra ? ` and ${extra}` : ''}`, '$top': '1' }
  });
  if (list.success && Array.isArray(list.data) && list.data.length > 0) return { success: true as const, data: list.data[0] };
  return { success: false as const, error: list.error };
}

/** Lee solo el estado actual (para validar antes de escribir) */
export async function fetchInvState(cfg: InvDocConfig, source: InvDocSource, id: number) {
  const entitySet = entitySetFor(cfg, source);
  const select =
    source === 'drafts'
      ? `DocEntry,DocumentStatus,DocObjectCode${cfg.drafts?.entity === 'Drafts' ? ',Cancelled' : ''}`
      : cfg.statusModel === 'document'
        ? 'DocEntry,DocumentStatus,Cancelled'
        : cfg.statusModel === 'posting'
          ? cfg.keyField
          : `${cfg.keyField},DocumentStatus`;
  const r = await querySapServiceLayer<SapRecord>(`${entitySet}(${id})`, { method: 'GET', params: { '$select': select } });
  if (!r.success || !r.data) return { success: false as const, error: r.error };
  if (source === 'drafts' && r.data.DocObjectCode !== cfg.drafts?.objectCode) {
    return { success: false as const, error: undefined, wrongType: true };
  }
  return { success: true as const, status: mapInvStatus(cfg, source, r.data) };
}
