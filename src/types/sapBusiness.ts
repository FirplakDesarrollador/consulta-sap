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
  taxId: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  balance: number;
  currency: string;
  groupName: string;
  status: 'Activo' | 'Inactivo';
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
