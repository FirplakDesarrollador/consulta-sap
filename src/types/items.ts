/** Tipos del Maestro de Artículos (OITM) vía SAP Service Layer */

export type ItemFieldValue = string | number | boolean;

export interface ItemRow {
  itemCode: string;
  itemName: string;
  foreignName: string;
  groupCode: number | null;
  barCode: string;
  inventoryItem: boolean;
  salesItem: boolean;
  purchaseItem: boolean;
  /** Activo / Inactivo (congelado) */
  status: 'Activo' | 'Inactivo';
  uom: string;
  defaultWarehouse: string;
  inStock: number;
  committed: number;
  ordered: number;
  available: number;
  avgPrice: number;
  updateDate: string;
}

export interface ItemWarehouseRow {
  warehouseCode: string;
  inStock: number;
  committed: number;
  ordered: number;
  available: number;
  minStock: number;
  maxStock: number;
  minOrder: number;
  avgPrice: number;
  locked: boolean;
}

export interface ItemPriceRow {
  priceList: number;
  price: number;
  currency: string;
  basePriceList: number;
  factor: number;
}

export interface ItemBarcodeRow {
  barcode: string;
  uomEntry: number | null;
  freeText: string;
}

export interface ItemDetail {
  itemCode: string;
  itemName: string;
  status: 'Activo' | 'Inactivo';
  /** Valores de los campos estándar, con las claves de ITEM_FIELDS */
  fields: Record<string, ItemFieldValue>;
  /** Campos de usuario (U_*) tal como vienen de SAP */
  udfs: Record<string, string | number>;
  totals: { inStock: number; committed: number; ordered: number; available: number };
  avgPrice: number;
  movingAvgPrice: number;
  createDate: string;
  updateDate: string;
  warehouses: ItemWarehouseRow[];
  prices: ItemPriceRow[];
  pricesTotal: number;
  barcodes: ItemBarcodeRow[];
  vendors: string[];
  allowed: { update: boolean; freeze: boolean; unfreeze: boolean; delete: boolean };
}

export interface ItemUdfDef {
  /** Nombre en el Service Layer, p.ej. U_Molde */
  name: string;
  label: string;
  kind: 'text' | 'number' | 'date';
  size?: number;
  mandatory: boolean;
  defaultValue?: string;
  validValues?: { value: string; label: string }[];
}

export interface ItemCatalogs {
  itemGroups: { code: number; name: string }[];
  manufacturers: { code: number; name: string }[];
  uomGroups: { code: number; name: string }[];
  warehouses: { code: string; name: string }[];
  priceLists: { code: number; name: string }[];
  udfs: ItemUdfDef[];
}
