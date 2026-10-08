export type SAPDocType = 'SD_ORDER' | 'MM_ORDER' | 'SD_INVOICE' | 'SD_DELIVERY' | 'FI_DOC' | 'MM_STOCK';

export interface SAPDocumentItem {
  pos: string;              // e.g. '000010'
  material: string;         // Material code e.g. 'MAT-9942-A'
  description: string;      // Description
  quantity: number;         // Cantidad
  unit: string;             // Unidad (ST, KG, M, etc.)
  netPrice: number;         // Precio unitario
  netValue: number;         // Valor neto
  taxValue: number;         // Impuestos
  currency: string;         // Moneda (USD, EUR, COP, MXN)
  plant: string;            // Centro (1010, 1020, etc.)
  storageLoc: string;       // Almacén (0001, 0002)
  status: 'Completado' | 'En Proceso' | 'Pendiente' | 'Bloqueado' | 'Cancelado';
  deliveryDate?: string;
  batch?: string;           // Lote
}

export interface DocumentFlowStep {
  id: string;
  docNumber: string;
  docType: string;
  description: string;
  date: string;
  time?: string;
  user: string;
  status: 'Completado' | 'En Proceso' | 'Pendiente' | 'Error';
  amount?: number;
  currency?: string;
}

export interface SAPDocument {
  id: string;
  docNumber: string;        // Número de documento SAP (e.g. '4500019283')
  type: SAPDocType;         // Tipo de documento
  typeName: string;         // 'Pedido de Venta (VA03)', 'Factura (VF03)', etc.
  tcode: string;            // Transacción SAP (VA03, ME23N, VF03, VL03N, FB03)
  companyCode: string;      // Sociedad (1000, 2000, 3000)
  salesOrg?: string;        // Org de Ventas (1000, 1010)
  purchasingOrg?: string;   // Org de Compras
  plant: string;            // Centro
  customer?: {
    id: string;
    name: string;
    taxId: string;
    city: string;
    country: string;
  };
  vendor?: {
    id: string;
    name: string;
    taxId: string;
    city: string;
    country: string;
  };
  docDate: string;          // Fecha documento
  postingDate?: string;     // Fecha contabilización
  currency: string;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  status: 'Liberado' | 'Contabilizado' | 'En Tránsito' | 'Pendiente' | 'Bloqueado' | 'Anulado';
  paymentTerms: string;     // Condición de pago (NT30, NT60, etc.)
  incoterms?: string;       // CIF, FOB, etc.
  createdBy: string;
  items: SAPDocumentItem[];
  flow: DocumentFlowStep[];
  notes?: string;
}

export interface StockItem {
  materialNumber: string;
  description: string;
  materialType: string;      // FERT, ROH, HALB, DIEN
  plant: string;
  plantName: string;
  storageLocation: string;
  storageName: string;
  unrestrictedStock: number; // Libre utilización
  qualityInspection: number; // En control de calidad
  blockedStock: number;      // Bloqueado
  inTransit: number;         // En tránsito
  unit: string;
  baseValuationPrice: number;
  currency: string;
  batches?: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    status: 'Libre' | 'Cuarentena' | 'Bloqueado';
  }[];
}

export interface OpenItemFI {
  docNumber: string;
  item: string;
  account: string;
  accountName: string;
  companyCode: string;
  postingDate: string;
  dueDate: string;
  overdueDays: number;
  amount: number;
  currency: string;
  status: 'Abierta' | 'Compensada' | 'Vencida';
  reference: string;
  clearingDoc?: string;
  clearingDate?: string;
}

export interface SAPSystemHealth {
  systemId: string;        // 'PRD' | 'QAS' | 'DEV'
  client: string;          // '100', '200'
  host: string;
  status: 'Online' | 'Degraded' | 'Offline';
  latencyMs: number;
  rfcConnector: string;
  lastSync: string;
  activeSessions: number;
  messageServer: string;
}
