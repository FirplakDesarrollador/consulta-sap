import { SAPDocument, StockItem, OpenItemFI, SAPSystemHealth } from '../types/sap';

export const mockSAPDocuments: SAPDocument[] = [
  {
    id: 'DOC-001',
    docNumber: '1000849201',
    type: 'SD_ORDER',
    typeName: 'Pedido de Venta (SD)',
    tcode: 'VA03',
    companyCode: '1000',
    salesOrg: '1010 - Ventas Nacionales',
    plant: '1010 - Planta Principal',
    customer: {
      id: 'CLI-00892',
      name: 'Distribuidora Andina S.A.',
      taxId: 'NIT 900.342.119-4',
      city: 'Bogotá D.C.',
      country: 'Colombia'
    },
    docDate: '2026-03-28',
    postingDate: '2026-03-28',
    currency: 'USD',
    netTotal: 18450.00,
    taxTotal: 3505.50,
    grossTotal: 21955.50,
    status: 'Liberado',
    paymentTerms: 'NT30 - 30 días neto',
    incoterms: 'CIF - Cost, Insurance & Freight',
    createdBy: 'JPEREZ (SD_ANALYST)',
    items: [
      {
        pos: '000010',
        material: 'MAT-9821-X',
        description: 'Válvula Hidráulica de Control de Flujo 2"',
        quantity: 25,
        unit: 'ST',
        netPrice: 420.00,
        netValue: 10500.00,
        taxValue: 1995.00,
        currency: 'USD',
        plant: '1010',
        storageLoc: '0001',
        status: 'Completado',
        deliveryDate: '2026-04-05',
        batch: 'LOT-2026-01B'
      },
      {
        pos: '000020',
        material: 'MAT-4410-B',
        description: 'Sensor de Presión Digital 0-100 BAR',
        quantity: 50,
        unit: 'ST',
        netPrice: 159.00,
        netValue: 7950.00,
        taxValue: 1510.50,
        currency: 'USD',
        plant: '1010',
        storageLoc: '0001',
        status: 'Completado',
        deliveryDate: '2026-04-05',
        batch: 'LOT-2026-04A'
      }
    ],
    flow: [
      {
        id: 'FLOW-1',
        docNumber: '2000041182',
        docType: 'Cotización Comercial (VA23)',
        description: 'Oferta vinculante al cliente',
        date: '2026-03-22',
        time: '09:15:00',
        user: 'JPEREZ',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      },
      {
        id: 'FLOW-2',
        docNumber: '1000849201',
        docType: 'Pedido de Venta (VA03)',
        description: 'Orden de venta confirmada',
        date: '2026-03-28',
        time: '14:30:12',
        user: 'JPEREZ',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      },
      {
        id: 'FLOW-3',
        docNumber: '8000492811',
        docType: 'Entrega de Salida (VL03N)',
        description: 'Picking y Salida de Mercancías efectuada',
        date: '2026-04-01',
        time: '11:05:44',
        user: 'WM_OP1',
        status: 'Completado'
      },
      {
        id: 'FLOW-4',
        docNumber: '9000188234',
        docType: 'Factura Comercial (VF03)',
        description: 'Facturación emitida y contabilizada',
        date: '2026-04-02',
        time: '16:20:10',
        user: 'FAC_BOT',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      },
      {
        id: 'FLOW-5',
        docNumber: '5100028190',
        docType: 'Documento Contable FI (FB03)',
        description: 'Asiento contable de deudor y cuenta de ingresos',
        date: '2026-04-02',
        time: '16:20:15',
        user: 'SYS_RFC',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      }
    ],
    notes: 'Pedido procesado con prioridad alta. Autorización de crédito aprobada por FIN_MGR.'
  },
  {
    id: 'DOC-002',
    docNumber: '4500192830',
    type: 'MM_ORDER',
    typeName: 'Pedido de Compra (MM)',
    tcode: 'ME23N',
    companyCode: '1000',
    purchasingOrg: '1000 - Compras Centrales',
    plant: '1020 - Centro Logístico Norte',
    vendor: {
      id: 'PRV-10928',
      name: 'Siemens Industrial Automation GmbH',
      taxId: 'DE 129274291',
      city: 'Múnich',
      country: 'Alemania'
    },
    docDate: '2026-04-01',
    postingDate: '2026-04-01',
    currency: 'EUR',
    netTotal: 42500.00,
    taxTotal: 8075.00,
    grossTotal: 50575.00,
    status: 'Liberado',
    paymentTerms: 'NT60 - 60 días fecha factura',
    incoterms: 'FOB - Free on Board',
    createdBy: 'MM_SPECIALIST',
    items: [
      {
        pos: '000010',
        material: 'MAT-PLC-770',
        description: 'Controlador PLC Simatic S7-1500 CPU 1516',
        quantity: 10,
        unit: 'ST',
        netPrice: 3100.00,
        netValue: 31000.00,
        taxValue: 5890.00,
        currency: 'EUR',
        plant: '1020',
        storageLoc: '0002',
        status: 'En Proceso',
        deliveryDate: '2026-04-20'
      },
      {
        pos: '000020',
        material: 'MAT-MOD-IO16',
        description: 'Módulo de Entradas/Salidas Digitales 24V DC',
        quantity: 20,
        unit: 'ST',
        netPrice: 575.00,
        netValue: 11500.00,
        taxValue: 2185.00,
        currency: 'EUR',
        plant: '1020',
        storageLoc: '0002',
        status: 'En Proceso',
        deliveryDate: '2026-04-20'
      }
    ],
    flow: [
      {
        id: 'FLOW-PO-1',
        docNumber: '100049182',
        docType: 'Solicitud de Pedido (ME53N)',
        description: 'SolPed generada por planificación MRP',
        date: '2026-03-25',
        user: 'MRP_BATCH',
        status: 'Completado'
      },
      {
        id: 'FLOW-PO-2',
        docNumber: '4500192830',
        docType: 'Pedido de Compras (ME23N)',
        description: 'Estrategia de liberación nivel 2 completada',
        date: '2026-04-01',
        user: 'MM_SPECIALIST',
        status: 'Completado',
        amount: 50575.00,
        currency: 'EUR'
      },
      {
        id: 'FLOW-PO-3',
        docNumber: '5000918201',
        docType: 'Entrada de Mercancías (MIGO 101)',
        description: 'Pendiente de recepción física en aduana',
        date: '2026-04-20',
        user: 'PENDIENTE',
        status: 'Pendiente'
      }
    ],
    notes: 'Liberación presupuestaria CAPEX aprobada bajo código WBS-IND-2026-09.'
  },
  {
    id: 'DOC-003',
    docNumber: '9000188234',
    type: 'SD_INVOICE',
    typeName: 'Factura de Cliente (SD)',
    tcode: 'VF03',
    companyCode: '1000',
    salesOrg: '1010 - Ventas Nacionales',
    plant: '1010 - Planta Principal',
    customer: {
      id: 'CLI-00892',
      name: 'Distribuidora Andina S.A.',
      taxId: 'NIT 900.342.119-4',
      city: 'Bogotá D.C.',
      country: 'Colombia'
    },
    docDate: '2026-04-02',
    postingDate: '2026-04-02',
    currency: 'USD',
    netTotal: 18450.00,
    taxTotal: 3505.50,
    grossTotal: 21955.50,
    status: 'Contabilizado',
    paymentTerms: 'NT30 - 30 días neto',
    createdBy: 'FAC_BOT',
    items: [
      {
        pos: '000010',
        material: 'MAT-9821-X',
        description: 'Válvula Hidráulica de Control de Flujo 2"',
        quantity: 25,
        unit: 'ST',
        netPrice: 420.00,
        netValue: 10500.00,
        taxValue: 1995.00,
        currency: 'USD',
        plant: '1010',
        storageLoc: '0001',
        status: 'Completado'
      },
      {
        pos: '000020',
        material: 'MAT-4410-B',
        description: 'Sensor de Presión Digital 0-100 BAR',
        quantity: 50,
        unit: 'ST',
        netPrice: 159.00,
        netValue: 7950.00,
        taxValue: 1510.50,
        currency: 'USD',
        plant: '1010',
        storageLoc: '0001',
        status: 'Completado'
      }
    ],
    flow: [
      {
        id: 'FLOW-INV-1',
        docNumber: '1000849201',
        docType: 'Pedido de Venta (VA03)',
        description: 'Pedido origen',
        date: '2026-03-28',
        user: 'JPEREZ',
        status: 'Completado'
      },
      {
        id: 'FLOW-INV-2',
        docNumber: '9000188234',
        docType: 'Factura Comercial (VF03)',
        description: 'Factura electrónica generada con CUFE',
        date: '2026-04-02',
        user: 'FAC_BOT',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'DOC-004',
    docNumber: '8000492811',
    type: 'SD_DELIVERY',
    typeName: 'Entrega de Salida (SD)',
    tcode: 'VL03N',
    companyCode: '1000',
    plant: '1010 - Planta Principal',
    customer: {
      id: 'CLI-00892',
      name: 'Distribuidora Andina S.A.',
      taxId: 'NIT 900.342.119-4',
      city: 'Bogotá D.C.',
      country: 'Colombia'
    },
    docDate: '2026-04-01',
    currency: 'USD',
    netTotal: 18450.00,
    taxTotal: 0,
    grossTotal: 18450.00,
    status: 'Contabilizado',
    paymentTerms: 'NT30',
    createdBy: 'WM_OP1',
    items: [
      {
        pos: '000010',
        material: 'MAT-9821-X',
        description: 'Válvula Hidráulica de Control de Flujo 2"',
        quantity: 25,
        unit: 'ST',
        netPrice: 420.00,
        netValue: 10500.00,
        taxValue: 0,
        currency: 'USD',
        plant: '1010',
        storageLoc: '0001',
        status: 'Completado',
        batch: 'LOT-2026-01B'
      }
    ],
    flow: [
      {
        id: 'FLOW-DEL-1',
        docNumber: '8000492811',
        docType: 'Entrega Salida (VL03N)',
        description: 'Salida de mercancías contabilizada con movimiento 601',
        date: '2026-04-01',
        user: 'WM_OP1',
        status: 'Completado'
      }
    ]
  },
  {
    id: 'DOC-005',
    docNumber: '5100028190',
    type: 'FI_DOC',
    typeName: 'Documento Contable (FI)',
    tcode: 'FB03',
    companyCode: '1000',
    plant: '1010',
    docDate: '2026-04-02',
    postingDate: '2026-04-02',
    currency: 'USD',
    netTotal: 21955.50,
    taxTotal: 3505.50,
    grossTotal: 21955.50,
    status: 'Contabilizado',
    paymentTerms: 'NT30',
    createdBy: 'SYS_RFC',
    items: [
      {
        pos: '000001',
        material: 'Cta 130505 - Clientes Nacionales',
        description: 'Débito Deudor Distribuidora Andina',
        quantity: 1,
        unit: 'UN',
        netPrice: 21955.50,
        netValue: 21955.50,
        taxValue: 0,
        currency: 'USD',
        plant: '1010',
        storageLoc: '-',
        status: 'Completado'
      },
      {
        pos: '000002',
        material: 'Cta 413501 - Venta de Equipos Hidráulicos',
        description: 'Crédito Ingresos Operacionales',
        quantity: 1,
        unit: 'UN',
        netPrice: 18450.00,
        netValue: 18450.00,
        taxValue: 0,
        currency: 'USD',
        plant: '1010',
        storageLoc: '-',
        status: 'Completado'
      },
      {
        pos: '000003',
        material: 'Cta 240801 - IVA Generado 19%',
        description: 'Crédito Impuesto sobre las ventas',
        quantity: 1,
        unit: 'UN',
        netPrice: 3505.50,
        netValue: 3505.50,
        taxValue: 0,
        currency: 'USD',
        plant: '1010',
        storageLoc: '-',
        status: 'Completado'
      }
    ],
    flow: [
      {
        id: 'FLOW-FI-1',
        docNumber: '5100028190',
        docType: 'Asiento Contable (FB03)',
        description: 'Contabilización Automática RV (SD)',
        date: '2026-04-02',
        user: 'SYS_RFC',
        status: 'Completado',
        amount: 21955.50,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'DOC-006',
    docNumber: '1000851120',
    type: 'SD_ORDER',
    typeName: 'Pedido de Venta (SD)',
    tcode: 'VA03',
    companyCode: '2000',
    salesOrg: '2000 - Ventas Exportación',
    plant: '2010 - Centro Manizales',
    customer: {
      id: 'CLI-00412',
      name: 'Consorcio Petrolero del Sur',
      taxId: 'RUT 811.092.441-2',
      city: 'Medellín',
      country: 'Colombia'
    },
    docDate: '2026-04-06',
    postingDate: '2026-04-06',
    currency: 'COP',
    netTotal: 84500000.00,
    taxTotal: 16055000.00,
    grossTotal: 100555000.00,
    status: 'Bloqueado',
    paymentTerms: 'NT15 - 15 días anticipado',
    incoterms: 'EXW - En Fábrica',
    createdBy: 'MRAMIREZ',
    items: [
      {
        pos: '000010',
        material: 'MAT-PUMP-88',
        description: 'Bomba Centrífuga Multietapa 50 HP',
        quantity: 3,
        unit: 'ST',
        netPrice: 28166666.67,
        netValue: 84500000.00,
        taxValue: 16055000.00,
        currency: 'COP',
        plant: '2010',
        storageLoc: '0001',
        status: 'Bloqueado',
        deliveryDate: '2026-05-10'
      }
    ],
    flow: [
      {
        id: 'FLOW-6-1',
        docNumber: '1000851120',
        docType: 'Pedido de Venta (VA03)',
        description: 'Bloqueo de crédito por sobregiro en límite de cartera',
        date: '2026-04-06',
        user: 'MRAMIREZ',
        status: 'Error',
        amount: 100555000.00,
        currency: 'COP'
      }
    ],
    notes: 'BLOQUEO DE CRÉDITO: Supera el límite de crédito en $18.400.000 COP. Requiere desbloqueo VKM1.'
  }
];

export const mockStockData: StockItem[] = [
  {
    materialNumber: 'MAT-9821-X',
    description: 'Válvula Hidráulica de Control de Flujo 2"',
    materialType: 'FERT',
    plant: '1010',
    plantName: 'Planta Principal Bogotá',
    storageLocation: '0001',
    storageName: 'Almacén Central Materia Prima y Prod.',
    unrestrictedStock: 480,
    qualityInspection: 35,
    blockedStock: 5,
    inTransit: 120,
    unit: 'ST',
    baseValuationPrice: 420.00,
    currency: 'USD',
    batches: [
      { batchNumber: 'LOT-2026-01B', quantity: 280, expiryDate: '2028-12-31', status: 'Libre' },
      { batchNumber: 'LOT-2026-02C', quantity: 200, expiryDate: '2029-06-30', status: 'Libre' },
      { batchNumber: 'LOT-2025-99A', quantity: 35, expiryDate: '2026-08-15', status: 'Cuarentena' }
    ]
  },
  {
    materialNumber: 'MAT-4410-B',
    description: 'Sensor de Presión Digital 0-100 BAR',
    materialType: 'FERT',
    plant: '1010',
    plantName: 'Planta Principal Bogotá',
    storageLocation: '0001',
    storageName: 'Almacén Central',
    unrestrictedStock: 920,
    qualityInspection: 0,
    blockedStock: 0,
    inTransit: 250,
    unit: 'ST',
    baseValuationPrice: 159.00,
    currency: 'USD',
    batches: [
      { batchNumber: 'LOT-2026-04A', quantity: 920, expiryDate: '2030-01-01', status: 'Libre' }
    ]
  },
  {
    materialNumber: 'MAT-PLC-770',
    description: 'Controlador PLC Simatic S7-1500 CPU 1516',
    materialType: 'ROH',
    plant: '1020',
    plantName: 'Centro Logístico Norte',
    storageLocation: '0002',
    storageName: 'Almacén de Repuestos y Componentes',
    unrestrictedStock: 14,
    qualityInspection: 2,
    blockedStock: 0,
    inTransit: 10,
    unit: 'ST',
    baseValuationPrice: 3100.00,
    currency: 'EUR'
  },
  {
    materialNumber: 'MAT-PUMP-88',
    description: 'Bomba Centrífuga Multietapa 50 HP',
    materialType: 'FERT',
    plant: '2010',
    plantName: 'Centro Manizales',
    storageLocation: '0001',
    storageName: 'Almacén Ensamblaje',
    unrestrictedStock: 6,
    qualityInspection: 1,
    blockedStock: 0,
    inTransit: 0,
    unit: 'ST',
    baseValuationPrice: 7200.00,
    currency: 'USD'
  }
];

export const mockOpenItems: OpenItemFI[] = [
  {
    docNumber: '5100028190',
    item: '001',
    account: 'CLI-00892',
    accountName: 'Distribuidora Andina S.A.',
    companyCode: '1000',
    postingDate: '2026-04-02',
    dueDate: '2026-05-02',
    overdueDays: 0,
    amount: 21955.50,
    currency: 'USD',
    status: 'Abierta',
    reference: 'FAC-9000188234'
  },
  {
    docNumber: '5100019022',
    item: '001',
    account: 'CLI-00412',
    accountName: 'Consorcio Petrolero del Sur',
    companyCode: '2000',
    postingDate: '2026-02-15',
    dueDate: '2026-03-02',
    overdueDays: 37,
    amount: 18400000.00,
    currency: 'COP',
    status: 'Vencida',
    reference: 'FAC-881290'
  },
  {
    docNumber: '5100014520',
    item: '001',
    account: 'CLI-00105',
    accountName: 'Industrias Químicas del Norte',
    companyCode: '1000',
    postingDate: '2026-01-10',
    dueDate: '2026-02-10',
    overdueDays: 0,
    amount: 14500.00,
    currency: 'USD',
    status: 'Compensada',
    reference: 'FAC-778901',
    clearingDoc: '5200004910',
    clearingDate: '2026-02-08'
  }
];

export const mockSystemHealth: SAPSystemHealth = {
  systemId: 'PRD - S/4HANA Enterprise',
  client: '100',
  host: 'sap-prd-app01.corp.internal:3300',
  status: 'Online',
  latencyMs: 38,
  rfcConnector: 'SAP JCo 3.1.8 / RFC Secure Gateway',
  lastSync: 'Hace 30 segundos',
  activeSessions: 142,
  messageServer: 'MS_S4H_PRD (Active)'
};
