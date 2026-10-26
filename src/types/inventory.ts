/**
 * Tipos compartidos (cliente/servidor) del módulo Inventarios (SAP Service Layer).
 */

export type InvDocKind =
  | 'goods-entries' // OIGN → InventoryGenEntries
  | 'goods-exits' // OIGE → InventoryGenExits
  | 'transfers' // OWTR → StockTransfers
  | 'transfer-requests' // OWTQ → InventoryTransferRequests
  | 'countings' // OINC → InventoryCountings
  | 'postings'; // OIQR → InventoryPostings

export type InvDocSource = 'documents' | 'drafts';

export type InvStatus = 'Abierto' | 'Cerrado' | 'Cancelado' | 'Contabilizado';

/** Campos de cabecera que la UI puede enviar (nombres neutros; el servidor los traduce a SAP) */
export type InvHeaderKey =
  | 'date'
  | 'dueDate'
  | 'comments'
  | 'reference2'
  | 'journalMemo'
  | 'fromWarehouse'
  | 'toWarehouse'
  | 'priceSource';

export interface InvDocRow {
  id: string;
  docEntry: number;
  docNum: string;
  date: string;
  dueDate: string;
  status: InvStatus;
  comments: string;
  reference2: string;
  journalMemo: string;
  fromWarehouse: string;
  toWarehouse: string;
  cardName: string;
  docTotal: number | null;
  currency: string;
}

export interface InvDocLine {
  lineNum: number;
  itemCode: string;
  description: string;
  quantity: number;
  openQuantity: number | null;
  price: number;
  lineTotal: number;
  warehouseCode: string;
  fromWarehouseCode: string;
  accountCode: string;
  uom: string;
  lineStatus: 'Abierta' | 'Cerrada';
  baseType: string | number | null;
  baseEntry: number | null;
  baseLine: number | null;
  inWarehouseQuantity: number | null;
  countedQuantity: number | null;
  counted: boolean | null;
  variance: number | null;
  remarks: string;
}

export interface InvDocDetail {
  kind: InvDocKind;
  source: InvDocSource;
  docEntry: number;
  docNum: string;
  date: string;
  dueDate: string;
  status: InvStatus;
  comments: string;
  reference2: string;
  journalMemo: string;
  fromWarehouse: string;
  toWarehouse: string;
  cardCode: string;
  cardName: string;
  docTotal: number | null;
  currency: string;
  priceSource: string;
  countingType: string;
  lines: InvDocLine[];
  /** Campos de cabecera editables en el estado actual */
  editableHeader: InvHeaderKey[];
  allowed: {
    update: boolean;
    updateLines: boolean;
    cancel: boolean;
    close: boolean;
    delete: boolean;
    saveDraftToDocument: boolean;
  };
}

export interface InvLineInput {
  lineNum?: number;
  itemCode?: string;
  quantity?: number;
  price?: number;
  warehouseCode?: string;
  fromWarehouseCode?: string;
  accountCode?: string;
  baseEntry?: number;
  baseLine?: number;
  countedQuantity?: number;
  remarks?: string;
}

export interface StockRow {
  itemCode: string;
  itemName: string;
  uom: string;
  warehouseCode: string;
  inStock: number;
  committed: number;
  ordered: number;
  available: number;
  minStock: number;
  maxStock: number;
  avgPrice: number;
  locked: boolean;
}

export type InvNumberType = 'serials' | 'batches';

export interface InvNumberRow {
  type: InvNumberType;
  docEntry: number;
  itemCode: string;
  itemDescription: string;
  number: string; // SerialNumber | Batch
  systemNumber: number | null;
  status: string; // lotes: Liberado/No accesible/Bloqueado
  mfrSerialNo: string;
  lotNumber: string;
  attribute1: string;
  attribute2: string;
  location: string;
  admissionDate: string;
  manufacturingDate: string;
  expirationDate: string;
  details: string;
  estadoMolde: string;
}
