export type ModuleCategory =
  | 'ventas'
  | 'compras'
  | 'inventarios'
  | 'socios'
  | 'articulos'
  | 'hbt'
  | 'querys';

export type SubModuleId =
  // Ventas
  | 'ventas_facturas'
  | 'ventas_pedidos'
  | 'ventas_clientes'
  // Compras
  | 'compras_entrada'
  | 'compras_orden'
  | 'compras_precio_entrega'
  // Inventarios
  | 'inv_entradas'
  | 'inv_salidas'
  | 'inv_traslados'
  | 'inv_auditoria'
  | 'inv_listas_precios'
  // Socios & Articulos
  | 'socios_maestro'
  | 'articulos_maestro'
  // HBT
  | 'hbt_gastos_expo'
  // Querys
  | 'query_costo_pt'
  | 'query_facturas_cliente'
  | 'query_salidas_concepto';

// --- Ventas & Compras Documents ---
export interface DocumentRow {
  id: string;
  docNum: string;
  docType: 'Factura' | 'Pedido' | 'Entrada Mercancía' | 'Orden de Compra' | 'Precio de Entrega';
  cardCode: string;
  cardName: string;
  docDate: string;
  docDueDate?: string;
  docTotal: number;
  currency: string;
  status: 'Abierto' | 'Cerrado' | 'Cancelado' | 'Pendiente';
  comments?: string;
  numAtCard?: string;
  salesPersonCode?: number;
  itemsCount: number;
  items?: {
    itemCode: string;
    description: string;
    quantity: number;
    price: number;
    total: number;
    whsCode: string;
  }[];
}

// --- Clientes & Socios de Negocio ---
export interface BusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: 'Cliente' | 'Proveedor' | 'Lead';
  rawCardType?: string;
  taxId: string;
  phone: string;
  phone1?: string;
  phone2?: string;
  cellular?: string;
  fax?: string;
  email: string;
  website?: string;
  city: string;
  address: string;
  balance: number;
  currency: string;
  groupCode?: number;
  groupName: string;
  status: 'Activo' | 'Inactivo';
  contactPerson?: string;
  notes?: string;
  aliasName?: string;
  industry?: string;
  projectCode?: string;
  territory?: string;
  languageCode?: number;
  globalLocationNumber?: string;
  additionalId?: string;
  unifiedFederalTaxId?: string;
  blockMarketing?: boolean;
}

export interface BusinessPartnerDetail extends BusinessPartner {
  foreignName?: string;
  shippingType?: string;
  channelPartnerCode?: string;
  openOrdersBalance?: number;
  openOpportunities?: number;
  createDate?: string;
  addresses?: {
    addressName: string;
    street: string;
    block?: string;
    city: string;
    state?: string;
    country?: string;
    addressType: 'Facturación' | 'Envío' | string;
    taxId?: string;
  }[];
  contacts?: {
    id?: number;
    name: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    address?: string;
    phone?: string;
    cellPhone?: string;
    email?: string;
  }[];
  paymentMethods?: {
    code: string;
  }[];
  hbtLocalization?: {
    tipDoc?: string;
    nombres?: string;
    apellido1?: string;
    apellido2?: string;
    regTrib?: string;
    munMed?: string;
    aplicaFel?: string;
  };
  raw?: any;
}

// --- Maestro del Articulo ---
export interface ItemMaster {
  itemCode: string;
  itemName: string;
  itemGroup: string;
  onHand: number;
  isCommited: number;
  onOrder: number;
  available: number;
  unitPrice: number;
  avgCost: number;
  currency: string;
  invntryUom: string;
  defaultWhs: string;
  status: 'Activo' | 'Inactivo';
}

// --- Inventarios Movimientos ---
export interface InventoryMovement {
  docNum: string;
  movementType: 'Entrada' | 'Salida' | 'Traslado';
  docDate: string;
  fromWhs?: string;
  toWhs?: string;
  whsCode?: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  totalCost: number;
  currency: string;
  reason: string;
  user: string;
}

// --- Localización HBT (Gastos Expo) ---
export interface HBTExpenseExpo {
  id: string;
  exportOrderNum: string;
  customsDeclaration: string; // Declaración de importación/exportación
  expenseConcept: string;
  providerTaxId: string;
  providerName: string;
  invoiceNumber: string;
  date: string;
  fobValueUSD: number;
  expenseAmountCOP: number;
  expenseAmountUSD: number;
  exchangeRate: number;
  status: 'Descargado' | 'Pendiente' | 'Contabilizado';
}

// --- Custom Query Result Record ---
export interface QueryRecord {
  [key: string]: any;
}

// --- Listas de Precios (OPLN / ItemPrices) ---
export interface SapPriceList {
  priceListNo: number;
  priceListName: string;
  basePriceList: number;
  factor: number;
  isGrossPrice: boolean;
  active: boolean;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface ItemPriceRow {
  itemCode: string;
  itemName: string;
  foreignName?: string;
  groupCode?: number;
  uom?: string;
  priceListNo: number;
  priceListName?: string;
  price: number;
  currency: string;
  factor?: number;
}
