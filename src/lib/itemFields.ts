/**
 * Definición única de los campos del Maestro de Artículos (entidad Items del Service Layer) que la
 * aplicación puede crear / modificar. La usan tanto las rutas (validación y mapeo a SAP) como los
 * formularios, de modo que ambos queden siempre alineados.
 *
 * Todos los nombres `sap` existen en el EntityType SAPB1.Item del $metadata (v1, 10.0).
 * Los campos `createOnly` solo se envían al crear: SAP los bloquea una vez que el artículo tiene movimientos.
 */
export type ItemFieldKind = 'text' | 'longtext' | 'number' | 'int' | 'yesno' | 'enum' | 'date';
export type ItemSection = 'general' | 'status' | 'purchasing' | 'sales' | 'inventory';
export type ItemLookup = 'itemGroups' | 'manufacturers' | 'uomGroups' | 'warehouses' | 'suppliers';

export interface ItemFieldDef {
  key: string;
  sap: string;
  label: string;
  kind: ItemFieldKind;
  section: ItemSection;
  max?: number;
  options?: { value: string; label: string }[];
  createOnly?: boolean;
  /** Obligatorio al crear */
  required?: boolean;
  /** Permite valores negativos (p.ej. -1 = "ninguno / manual" en fabricante y UoM) */
  allowNegative?: boolean;
  lookup?: ItemLookup;
  help?: string;
}

const opt = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));

export const ITEM_FIELDS: ItemFieldDef[] = [
  // ---- General ----
  { key: 'itemName', sap: 'ItemName', label: 'Descripción', kind: 'text', section: 'general', max: 100, required: true },
  { key: 'foreignName', sap: 'ForeignName', label: 'Descripción en otro idioma', kind: 'text', section: 'general', max: 100 },
  { key: 'itemsGroupCode', sap: 'ItemsGroupCode', label: 'Grupo de artículos', kind: 'int', section: 'general', lookup: 'itemGroups', required: true },
  {
    key: 'itemType',
    sap: 'ItemType',
    label: 'Tipo de artículo',
    kind: 'enum',
    section: 'general',
    createOnly: true,
    options: opt([
      ['itItems', 'Artículos'],
      ['itLabor', 'Mano de obra'],
      ['itTravel', 'Viajes']
    ]),
    help: 'Los activos fijos no se crean desde aquí (requieren parámetros adicionales).'
  },
  { key: 'barCode', sap: 'BarCode', label: 'Código de barras', kind: 'text', section: 'general', max: 254 },
  { key: 'manufacturer', sap: 'Manufacturer', label: 'Fabricante', kind: 'int', section: 'general', lookup: 'manufacturers', allowNegative: true },
  { key: 'sww', sap: 'SWW', label: 'Identificador adicional', kind: 'text', section: 'general', max: 16 },
  { key: 'purchaseItem', sap: 'PurchaseItem', label: 'Artículo de compra', kind: 'yesno', section: 'general' },
  { key: 'salesItem', sap: 'SalesItem', label: 'Artículo de venta', kind: 'yesno', section: 'general' },
  { key: 'inventoryItem', sap: 'InventoryItem', label: 'Artículo de inventario', kind: 'yesno', section: 'general', createOnly: true },
  { key: 'noDiscounts', sap: 'NoDiscounts', label: 'Sin descuentos', kind: 'yesno', section: 'general' },
  { key: 'userText', sap: 'User_Text', label: 'Observaciones', kind: 'longtext', section: 'general', max: 3000 },

  // ---- Vigencia (la acción Inactivar/Activar usa Frozen + Valid) ----
  { key: 'validFrom', sap: 'ValidFrom', label: 'Activo desde', kind: 'date', section: 'status' },
  { key: 'validTo', sap: 'ValidTo', label: 'Activo hasta', kind: 'date', section: 'status' },
  { key: 'validRemarks', sap: 'ValidRemarks', label: 'Comentario de vigencia', kind: 'text', section: 'status', max: 30 },
  { key: 'frozenFrom', sap: 'FrozenFrom', label: 'Inactivo desde', kind: 'date', section: 'status' },
  { key: 'frozenTo', sap: 'FrozenTo', label: 'Inactivo hasta', kind: 'date', section: 'status' },
  { key: 'frozenRemarks', sap: 'FrozenRemarks', label: 'Comentario de inactivación', kind: 'text', section: 'status', max: 30 },

  // ---- Compras ----
  { key: 'mainSupplier', sap: 'Mainsupplier', label: 'Proveedor principal', kind: 'text', section: 'purchasing', lookup: 'suppliers', max: 15 },
  { key: 'supplierCatalogNo', sap: 'SupplierCatalogNo', label: 'N.º de catálogo del proveedor', kind: 'text', section: 'purchasing', max: 17 },
  { key: 'purchaseUnit', sap: 'PurchaseUnit', label: 'Unidad de compra', kind: 'text', section: 'purchasing', max: 100 },
  { key: 'purchaseItemsPerUnit', sap: 'PurchaseItemsPerUnit', label: 'Artículos por unidad de compra', kind: 'number', section: 'purchasing' },
  { key: 'purchasePackagingUnit', sap: 'PurchasePackagingUnit', label: 'Unidad de embalaje (compra)', kind: 'text', section: 'purchasing', max: 100 },
  { key: 'purchaseQtyPerPackUnit', sap: 'PurchaseQtyPerPackUnit', label: 'Cantidad por embalaje (compra)', kind: 'number', section: 'purchasing' },
  { key: 'purchaseVatGroup', sap: 'PurchaseVATGroup', label: 'Grupo de impuestos (compra)', kind: 'text', section: 'purchasing', max: 8 },
  { key: 'apTaxCode', sap: 'ApTaxCode', label: 'Código de impuesto (compra)', kind: 'text', section: 'purchasing', max: 8 },
  {
    key: 'procurementMethod',
    sap: 'ProcurementMethod',
    label: 'Método de abastecimiento',
    kind: 'enum',
    section: 'purchasing',
    options: opt([
      ['bom_Buy', 'Comprar'],
      ['bom_Make', 'Fabricar']
    ])
  },
  {
    key: 'planningSystem',
    sap: 'PlanningSystem',
    label: 'Planificación (MRP)',
    kind: 'enum',
    section: 'purchasing',
    options: opt([
      ['bop_MRP', 'MRP'],
      ['bop_None', 'Ninguna']
    ])
  },
  { key: 'leadTime', sap: 'LeadTime', label: 'Plazo de entrega (días)', kind: 'int', section: 'purchasing' },
  { key: 'minOrderQuantity', sap: 'MinOrderQuantity', label: 'Cantidad mínima de pedido', kind: 'number', section: 'purchasing' },

  // ---- Ventas ----
  { key: 'salesUnit', sap: 'SalesUnit', label: 'Unidad de venta', kind: 'text', section: 'sales', max: 100 },
  { key: 'salesItemsPerUnit', sap: 'SalesItemsPerUnit', label: 'Artículos por unidad de venta', kind: 'number', section: 'sales' },
  { key: 'salesPackagingUnit', sap: 'SalesPackagingUnit', label: 'Unidad de embalaje (venta)', kind: 'text', section: 'sales', max: 100 },
  { key: 'salesQtyPerPackUnit', sap: 'SalesQtyPerPackUnit', label: 'Cantidad por embalaje (venta)', kind: 'number', section: 'sales' },
  { key: 'vatLiable', sap: 'VatLiable', label: 'Sujeto a impuestos', kind: 'yesno', section: 'sales' },
  { key: 'salesVatGroup', sap: 'SalesVATGroup', label: 'Grupo de impuestos (venta)', kind: 'text', section: 'sales', max: 8 },
  { key: 'arTaxCode', sap: 'ArTaxCode', label: 'Código de impuesto (venta)', kind: 'text', section: 'sales', max: 8 },

  // ---- Inventario ----
  { key: 'inventoryUOM', sap: 'InventoryUOM', label: 'Unidad de medida de inventario', kind: 'text', section: 'inventory', max: 100 },
  { key: 'uoMGroupEntry', sap: 'UoMGroupEntry', label: 'Grupo de unidades de medida', kind: 'int', section: 'inventory', lookup: 'uomGroups', createOnly: true, allowNegative: true },
  { key: 'inventoryUoMEntry', sap: 'InventoryUoMEntry', label: 'UdM de inventario (código)', kind: 'int', section: 'inventory', createOnly: true, allowNegative: true },
  { key: 'defaultSalesUoMEntry', sap: 'DefaultSalesUoMEntry', label: 'UdM de venta por defecto (código)', kind: 'int', section: 'inventory', allowNegative: true },
  { key: 'defaultPurchasingUoMEntry', sap: 'DefaultPurchasingUoMEntry', label: 'UdM de compra por defecto (código)', kind: 'int', section: 'inventory', allowNegative: true },
  { key: 'defaultWarehouse', sap: 'DefaultWarehouse', label: 'Almacén por defecto', kind: 'text', section: 'inventory', lookup: 'warehouses', max: 8 },
  { key: 'manageStockByWarehouse', sap: 'ManageStockByWarehouse', label: 'Gestionar existencias por almacén', kind: 'yesno', section: 'inventory', createOnly: true },
  { key: 'manageSerialNumbers', sap: 'ManageSerialNumbers', label: 'Gestionar por números de serie', kind: 'yesno', section: 'inventory', createOnly: true },
  { key: 'manageBatchNumbers', sap: 'ManageBatchNumbers', label: 'Gestionar por lotes', kind: 'yesno', section: 'inventory', createOnly: true },
  {
    key: 'costAccountingMethod',
    sap: 'CostAccountingMethod',
    label: 'Método de valoración',
    kind: 'enum',
    section: 'inventory',
    createOnly: true,
    options: opt([
      ['bis_MovingAverage', 'Promedio móvil'],
      ['bis_Standard', 'Estándar'],
      ['bis_FIFO', 'FIFO']
    ])
  },
  {
    key: 'glMethod',
    sap: 'GLMethod',
    label: 'Cuentas contables por',
    kind: 'enum',
    section: 'inventory',
    options: opt([
      ['glm_WH', 'Almacén'],
      ['glm_ItemClass', 'Clase de artículo'],
      ['glm_ItemLevel', 'Artículo']
    ])
  },
  {
    key: 'issueMethod',
    sap: 'IssueMethod',
    label: 'Método de emisión',
    kind: 'enum',
    section: 'inventory',
    options: opt([
      ['im_Backflush', 'Backflush'],
      ['im_Manual', 'Manual']
    ])
  },
  { key: 'minInventory', sap: 'MinInventory', label: 'Stock mínimo', kind: 'number', section: 'inventory' },
  { key: 'maxInventory', sap: 'MaxInventory', label: 'Stock máximo', kind: 'number', section: 'inventory' },
  { key: 'desiredInventory', sap: 'DesiredInventory', label: 'Stock requerido', kind: 'number', section: 'inventory' },
  { key: 'inventoryWeight', sap: 'InventoryWeight', label: 'Peso de inventario', kind: 'number', section: 'inventory' }
];

export const ITEM_FIELD_BY_KEY: Record<string, ItemFieldDef> = Object.fromEntries(ITEM_FIELDS.map((f) => [f.key, f]));

export const ITEM_SECTION_LABEL: Record<ItemSection, string> = {
  general: 'General',
  status: 'Vigencia',
  purchasing: 'Compras',
  sales: 'Ventas',
  inventory: 'Inventario'
};

/** Valor inicial por defecto de cada tipo de campo en los formularios */
export function emptyFieldValue(f: ItemFieldDef): string | boolean {
  return f.kind === 'yesno' ? false : '';
}

export const ITEM_CODE_RE = /^[A-Za-z0-9._\-/ ]{1,50}$/;
export const UDF_NAME_RE = /^U_[A-Za-z0-9_]{1,29}$/;
