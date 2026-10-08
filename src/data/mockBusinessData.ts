import {
  DocumentRow,
  BusinessPartner,
  ItemMaster,
  InventoryMovement,
  HBTExpenseExpo
} from '../types/sapBusiness';

// 1. VENTAS
export const mockFacturasVenta: DocumentRow[] = [
  {
    id: 'FV-1001',
    docNum: 'FV-0049281',
    docType: 'Factura',
    cardCode: 'C900123456',
    cardName: 'Distribuidora Andina S.A.S.',
    docDate: '2026-04-02',
    docDueDate: '2026-05-02',
    docTotal: 14500000,
    currency: 'COP',
    status: 'Cerrado',
    comments: 'Factura electrónica FE-9821 con entrega asociada',
    itemsCount: 3,
    items: [
      { itemCode: 'PT-VALV-01', description: 'Válvula de Control 2"', quantity: 10, price: 850000, total: 8500000, whsCode: '01' },
      { itemCode: 'PT-SENS-04', description: 'Sensor Digital de Presión', quantity: 20, price: 300000, total: 6000000, whsCode: '01' }
    ]
  },
  {
    id: 'FV-1002',
    docNum: 'FV-0049282',
    docType: 'Factura',
    cardCode: 'C800987654',
    cardName: 'Comercializadora del Caribe Ltda.',
    docDate: '2026-04-05',
    docDueDate: '2026-05-05',
    docTotal: 28900000,
    currency: 'COP',
    status: 'Abierto',
    comments: 'Venta a crédito 30 días - Despacho Barranquilla',
    itemsCount: 5
  },
  {
    id: 'FV-1003',
    docNum: 'FV-0049283',
    docType: 'Factura',
    cardCode: 'C860111222',
    cardName: 'Inversiones Industriales del Sur',
    docDate: '2026-04-07',
    docDueDate: '2026-04-22',
    docTotal: 8400.00,
    currency: 'USD',
    status: 'Abierto',
    comments: 'Factura de exportación cliente exterior',
    itemsCount: 2
  }
];

export const mockPedidosVenta: DocumentRow[] = [
  {
    id: 'PV-2001',
    docNum: 'PV-0018290',
    docType: 'Pedido',
    cardCode: 'C900123456',
    cardName: 'Distribuidora Andina S.A.S.',
    docDate: '2026-04-01',
    docDueDate: '2026-04-15',
    docTotal: 14500000,
    currency: 'COP',
    status: 'Cerrado',
    comments: 'Pedido confirmado y despachado',
    itemsCount: 3
  },
  {
    id: 'PV-2002',
    docNum: 'PV-0018291',
    docType: 'Pedido',
    cardCode: 'C900555666',
    cardName: 'Constructora Bolívar & Cía.',
    docDate: '2026-04-06',
    docDueDate: '2026-04-20',
    docTotal: 34200000,
    currency: 'COP',
    status: 'Abierto',
    comments: 'Pendiente de entrega en almacén obra norte',
    itemsCount: 6
  },
  {
    id: 'PV-2003',
    docNum: 'PV-0018292',
    docType: 'Pedido',
    cardCode: 'C800987654',
    cardName: 'Comercializadora del Caribe Ltda.',
    docDate: '2026-04-07',
    docDueDate: '2026-04-25',
    docTotal: 12100000,
    currency: 'COP',
    status: 'Pendiente',
    comments: 'En revisión de límite de crédito cartera',
    itemsCount: 2
  }
];

// 2. COMPRAS
export const mockEntradasMercancia: DocumentRow[] = [
  {
    id: 'EM-3001',
    docNum: 'EM-0078120',
    docType: 'Entrada Mercancía',
    cardCode: 'P890123999',
    cardName: 'Aceros & Tubulares Nacionales S.A.',
    docDate: '2026-04-03',
    docTotal: 45000000,
    currency: 'COP',
    status: 'Cerrado',
    comments: 'Recepción contra OC-003310. Inspección de calidad OK.',
    itemsCount: 4
  },
  {
    id: 'EM-3002',
    docNum: 'EM-0078121',
    docType: 'Entrada Mercancía',
    cardCode: 'P900888777',
    cardName: 'Siemens Industrial Automation GmbH',
    docDate: '2026-04-06',
    docTotal: 24500.00,
    currency: 'USD',
    status: 'Abierto',
    comments: 'Llegada de importación BL-9921 al puerto de Buenaventura',
    itemsCount: 2
  }
];

export const mockOrdenesCompra: DocumentRow[] = [
  {
    id: 'OC-4001',
    docNum: 'OC-003310',
    docType: 'Orden de Compra',
    cardCode: 'P890123999',
    cardName: 'Aceros & Tubulares Nacionales S.A.',
    docDate: '2026-03-25',
    docDueDate: '2026-04-03',
    docTotal: 45000000,
    currency: 'COP',
    status: 'Cerrado',
    comments: 'Orden completada con recepción de almacén',
    itemsCount: 4
  },
  {
    id: 'OC-4002',
    docNum: 'OC-003311',
    docType: 'Orden de Compra',
    cardCode: 'P900888777',
    cardName: 'Siemens Industrial Automation GmbH',
    docDate: '2026-03-28',
    docDueDate: '2026-04-18',
    docTotal: 24500.00,
    currency: 'USD',
    status: 'Abierto',
    comments: 'Pedido internacional de componentes PLC y sensores',
    itemsCount: 2
  },
  {
    id: 'OC-4003',
    docNum: 'OC-003312',
    docType: 'Orden de Compra',
    cardCode: 'P860444333',
    cardName: 'Empaques y Plásticos Industriales',
    docDate: '2026-04-04',
    docDueDate: '2026-04-12',
    docTotal: 7800000,
    currency: 'COP',
    status: 'Pendiente',
    comments: 'Insumos para empaque producto final',
    itemsCount: 1
  }
];

export const mockPreciosEntrega: DocumentRow[] = [
  {
    id: 'PE-5001',
    docNum: 'PE-000412',
    docType: 'Precio de Entrega',
    cardCode: 'P900888777',
    cardName: 'Siemens Industrial Automation (Landed Costs)',
    docDate: '2026-04-05',
    docTotal: 8450000,
    currency: 'COP',
    status: 'Cerrado',
    comments: 'Costos de flete marítimo, aranceles DIAN y agenciamiento aduanero',
    itemsCount: 2
  },
  {
    id: 'PE-5002',
    docNum: 'PE-000413',
    docType: 'Precio de Entrega',
    cardCode: 'P890333222',
    cardName: 'Agencia de Aduanas ABC Nivel 1',
    docDate: '2026-04-07',
    docTotal: 4120000,
    currency: 'COP',
    status: 'Abierto',
    comments: 'Gastos de nacionalización pendientes de prorrateo',
    itemsCount: 1
  }
];

// 3. INVENTARIOS
export const mockMovimientosInventario: InventoryMovement[] = [
  {
    docNum: 'ENT-001091',
    movementType: 'Entrada',
    docDate: '2026-04-02',
    whsCode: '01 - Principal',
    itemCode: 'PT-VALV-01',
    itemName: 'Válvula de Control 2" Flujo Continuo',
    quantity: 50,
    unit: 'UN',
    cost: 520000,
    totalCost: 26000000,
    currency: 'COP',
    reason: 'Entrada de producción orden #OP-8812',
    user: 'OPERADOR_PROD'
  },
  {
    docNum: 'SAL-004419',
    movementType: 'Salida',
    docDate: '2026-04-03',
    whsCode: '02 - Materia Prima',
    itemCode: 'MP-ACERO-304',
    itemName: 'Lámina de Acero Inoxidable 304 2mm',
    quantity: 15,
    unit: 'UN',
    cost: 410000,
    totalCost: 6150000,
    currency: 'COP',
    reason: 'Consumo para orden de fabricación #OP-8815',
    user: 'JEFE_PLANTA'
  },
  {
    docNum: 'TRS-000881',
    movementType: 'Traslado',
    docDate: '2026-04-05',
    fromWhs: '01 - Planta Principal',
    toWhs: '03 - Almacén Zona Franca',
    itemCode: 'PT-SENS-04',
    itemName: 'Sensor Digital de Presión 0-100 BAR',
    quantity: 30,
    unit: 'UN',
    cost: 180000,
    totalCost: 5400000,
    currency: 'COP',
    reason: 'Traslado para consolidación de embarque exportación',
    user: 'LOGISTICA_EXP'
  },
  {
    docNum: 'ENT-001092',
    movementType: 'Entrada',
    docDate: '2026-04-06',
    whsCode: '01 - Principal',
    itemCode: 'PT-PUMP-50',
    itemName: 'Bomba Centrífuga Industrial 50HP',
    quantity: 4,
    unit: 'UN',
    cost: 14500000,
    totalCost: 58000000,
    currency: 'COP',
    reason: 'Terminación de ensamble mecánico',
    user: 'OPERADOR_PROD'
  }
];

// 4. SOCIOS DE NEGOCIO (Clientes / Proveedores)
export const mockSociosNegocio: BusinessPartner[] = [
  {
    cardCode: 'C900123456',
    cardName: 'Distribuidora Andina S.A.S.',
    cardType: 'Cliente',
    taxId: '900.123.456-1',
    phone: '+57 (1) 745-9000',
    email: 'contacto@distribuidoraandina.com.co',
    city: 'Bogotá D.C.',
    address: 'Calle 26 # 68-15 Edificio Capital',
    balance: 14500000,
    currency: 'COP',
    groupName: 'Clientes Industriales Nacionales',
    status: 'Activo'
  },
  {
    cardCode: 'C800987654',
    cardName: 'Comercializadora del Caribe Ltda.',
    cardType: 'Cliente',
    taxId: '800.987.654-3',
    phone: '+57 (5) 360-1234',
    email: 'compras@caribeltd.com',
    city: 'Barranquilla',
    address: 'Vía 40 # 73-290',
    balance: 28900000,
    currency: 'COP',
    groupName: 'Distribuidores Regionales',
    status: 'Activo'
  },
  {
    cardCode: 'C860111222',
    cardName: 'Inversiones Industriales del Sur',
    cardType: 'Cliente',
    taxId: '860.111.222-9',
    phone: '+57 (2) 660-8800',
    email: 'facturacion@indulsur.com',
    city: 'Cali',
    address: 'Carrera 1 # 24-50',
    balance: 8400.00,
    currency: 'USD',
    groupName: 'Clientes VIP Exportación',
    status: 'Activo'
  },
  {
    cardCode: 'P890123999',
    cardName: 'Aceros & Tubulares Nacionales S.A.',
    cardType: 'Proveedor',
    taxId: '890.123.999-5',
    phone: '+57 (4) 444-5500',
    email: 'ventas@acerosnacionales.com',
    city: 'Medellín',
    address: 'Calle 10 Sur # 50-10',
    balance: 0,
    currency: 'COP',
    groupName: 'Proveedores Materias Primas',
    status: 'Activo'
  },
  {
    cardCode: 'P900888777',
    cardName: 'Siemens Industrial Automation GmbH',
    cardType: 'Proveedor',
    taxId: 'DE-12928811',
    phone: '+49 89 636-00',
    email: 'orders.latam@siemens.com',
    city: 'Múnich',
    address: 'Werner-von-Siemens-Straße 1',
    balance: 24500.00,
    currency: 'USD',
    groupName: 'Proveedores Internacionales Maquinaria',
    status: 'Activo'
  }
];

// 5. MAESTRO DE ARTÍCULOS
export const mockArticulos: ItemMaster[] = [
  {
    itemCode: 'PT-VALV-01',
    itemName: 'Válvula de Control 2" Flujo Continuo',
    itemGroup: 'Producto Terminado',
    onHand: 140,
    isCommited: 30,
    onOrder: 50,
    available: 160,
    unitPrice: 850000,
    avgCost: 520000,
    currency: 'COP',
    invntryUom: 'UN',
    defaultWhs: '01 - Principal',
    status: 'Activo'
  },
  {
    itemCode: 'PT-SENS-04',
    itemName: 'Sensor Digital de Presión 0-100 BAR',
    itemGroup: 'Producto Terminado',
    onHand: 310,
    isCommited: 50,
    onOrder: 100,
    available: 360,
    unitPrice: 300000,
    avgCost: 180000,
    currency: 'COP',
    invntryUom: 'UN',
    defaultWhs: '01 - Principal',
    status: 'Activo'
  },
  {
    itemCode: 'PT-PUMP-50',
    itemName: 'Bomba Centrífuga Industrial 50HP Multietapa',
    itemGroup: 'Producto Terminado',
    onHand: 8,
    isCommited: 2,
    onOrder: 5,
    available: 11,
    unitPrice: 22000000,
    avgCost: 14500000,
    currency: 'COP',
    invntryUom: 'UN',
    defaultWhs: '01 - Principal',
    status: 'Activo'
  },
  {
    itemCode: 'MP-ACERO-304',
    itemName: 'Lámina de Acero Inoxidable 304 2mm',
    itemGroup: 'Materia Prima',
    onHand: 85,
    isCommited: 20,
    onOrder: 40,
    available: 105,
    unitPrice: 600000,
    avgCost: 410000,
    currency: 'COP',
    invntryUom: 'UN',
    defaultWhs: '02 - Materia Prima',
    status: 'Activo'
  },
  {
    itemCode: 'INS-EMPAQ-01',
    itemName: 'Kit de Empaques y Sellos de Nitrilo',
    itemGroup: 'Insumos y Repuestos',
    onHand: 620,
    isCommited: 80,
    onOrder: 200,
    available: 740,
    unitPrice: 45000,
    avgCost: 28000,
    currency: 'COP',
    invntryUom: 'KT',
    defaultWhs: '01 - Principal',
    status: 'Activo'
  }
];

// 6. LOCALIZACIÓN HBT (Descarga Gastos Expo)
export const mockHBTGastosExpo: HBTExpenseExpo[] = [
  {
    id: 'HBT-001',
    exportOrderNum: 'EXP-2026-089',
    customsDeclaration: 'DEX-0491829012',
    expenseConcept: 'Flete Internacional Marítimo a Miami',
    providerTaxId: '900.812.341-0',
    providerName: 'Maersk Colombia S.A.',
    invoiceNumber: 'FE-881290',
    date: '2026-03-29',
    fobValueUSD: 48500.00,
    expenseAmountCOP: 14250000,
    expenseAmountUSD: 3650.00,
    exchangeRate: 3904.11,
    status: 'Descargado'
  },
  {
    id: 'HBT-002',
    exportOrderNum: 'EXP-2026-089',
    customsDeclaration: 'DEX-0491829012',
    expenseConcept: 'Agenciamiento Aduanero y Vistos Buenos VUCE',
    providerTaxId: '860.009.112-4',
    providerName: 'Agencia de Aduanas Siaco S.A.S.',
    invoiceNumber: 'FE-33109',
    date: '2026-03-30',
    fobValueUSD: 48500.00,
    expenseAmountCOP: 3800000,
    expenseAmountUSD: 973.33,
    exchangeRate: 3904.11,
    status: 'Descargado'
  },
  {
    id: 'HBT-003',
    exportOrderNum: 'EXP-2026-094',
    customsDeclaration: 'DEX-0491829045',
    expenseConcept: 'Seguro Internacional de Carga Todo Riesgo',
    providerTaxId: '860.002.503-1',
    providerName: 'Seguros Bolívar S.A.',
    invoiceNumber: 'POL-90014',
    date: '2026-04-03',
    fobValueUSD: 84000.00,
    expenseAmountCOP: 6100000,
    expenseAmountUSD: 1562.45,
    exchangeRate: 3904.11,
    status: 'Pendiente'
  },
  {
    id: 'HBT-004',
    exportOrderNum: 'EXP-2026-097',
    customsDeclaration: 'DEX-0491829088',
    expenseConcept: 'Almacenamiento y Manejo Portuario SPB',
    providerTaxId: '890.399.120-8',
    providerName: 'Sociedad Portuaria Regional de Buenaventura',
    invoiceNumber: 'SPB-55410',
    date: '2026-04-06',
    fobValueUSD: 32000.00,
    expenseAmountCOP: 2950000,
    expenseAmountUSD: 755.61,
    exchangeRate: 3904.11,
    status: 'Contabilizado'
  }
];

// 7. QUERYS PERSONALIZADAS
export const mockQueryCostoProductoTerminado = [
  {
    codigoPT: 'PT-VALV-01',
    descripcionPT: 'Válvula de Control 2" Flujo Continuo',
    centroCosto: 'CC-MEC-01',
    costoMateriaPrima: 320000,
    costoManoObra: 120000,
    costosIndirectosCIF: 80000,
    costoTotalUnitario: 520000,
    precioVentaSugerido: 850000,
    margenBrutoPct: '38.82%',
    ultimoLoteCerrado: 'LOT-2026-03B',
    fechaCalculo: '2026-04-01'
  },
  {
    codigoPT: 'PT-SENS-04',
    descripcionPT: 'Sensor Digital de Presión 0-100 BAR',
    centroCosto: 'CC-ELEC-02',
    costoMateriaPrima: 110000,
    costoManoObra: 45000,
    costosIndirectosCIF: 25000,
    costoTotalUnitario: 180000,
    precioVentaSugerido: 300000,
    margenBrutoPct: '40.00%',
    ultimoLoteCerrado: 'LOT-2026-04A',
    fechaCalculo: '2026-04-01'
  },
  {
    codigoPT: 'PT-PUMP-50',
    descripcionPT: 'Bomba Centrífuga Industrial 50HP Multietapa',
    centroCosto: 'CC-ENS-03',
    costoMateriaPrima: 9500000,
    costoManoObra: 3200000,
    costosIndirectosCIF: 1800000,
    costoTotalUnitario: 14500000,
    precioVentaSugerido: 22000000,
    margenBrutoPct: '34.09%',
    ultimoLoteCerrado: 'LOT-2026-02X',
    fechaCalculo: '2026-04-02'
  }
];

export const mockQueryFacturasClienteFinal = [
  {
    numFactura: 'FV-0049281',
    fechaEmision: '2026-04-02',
    nitCliente: '900.123.456-1',
    nombreCliente: 'Distribuidora Andina S.A.S.',
    vendedor: 'Carlos Restrepo',
    subtotal: 12184874,
    iva19: 2315126,
    totalFactura: 14500000,
    moneda: 'COP',
    formaPago: 'Crédito 30 días',
    estadoDIAN: 'Aprobado CUFE OK',
    ciudad: 'Bogotá D.C.'
  },
  {
    numFactura: 'FV-0049282',
    fechaEmision: '2026-04-05',
    nitCliente: '800.987.654-3',
    nombreCliente: 'Comercializadora del Caribe Ltda.',
    vendedor: 'Maria Fernanda Gomez',
    subtotal: 24285714,
    iva19: 4614286,
    totalFactura: 28900000,
    moneda: 'COP',
    formaPago: 'Crédito 30 días',
    estadoDIAN: 'Aprobado CUFE OK',
    ciudad: 'Barranquilla'
  },
  {
    numFactura: 'FV-0049283',
    fechaEmision: '2026-04-07',
    nitCliente: '860.111.222-9',
    nombreCliente: 'Inversiones Industriales del Sur',
    vendedor: 'Andres Felipe Rojas',
    subtotal: 8400.00,
    iva19: 0,
    totalFactura: 8400.00,
    moneda: 'USD',
    formaPago: 'Giro Anticipado Directo',
    estadoDIAN: 'Factura Expo Validada',
    ciudad: 'Cali'
  }
];

export const mockQuerySalidasConcepto = [
  {
    concepto: 'Consumo para Fabricación y Ensamble (OP)',
    cuentaContable: '710501 - Consumo Materiales Directos',
    cantidadMovimientos: 48,
    totalCantidad: 420,
    unidad: 'UN',
    costoTotalCOP: 84500000,
    porcentajeParticipacion: '62.4%'
  },
  {
    concepto: 'Muestras Comerciales y Calidad',
    cuentaContable: '523560 - Muestras sin Valor Comercial',
    cantidadMovimientos: 12,
    totalCantidad: 35,
    unidad: 'UN',
    costoTotalCOP: 4800000,
    porcentajeParticipacion: '3.5%'
  },
  {
    concepto: 'Garantías y Reposición Técnica',
    cuentaContable: '513515 - Gastos por Garantías de Fábrica',
    cantidadMovimientos: 6,
    totalCantidad: 8,
    unidad: 'UN',
    costoTotalCOP: 7200000,
    porcentajeParticipacion: '5.3%'
  },
  {
    concepto: 'Ajuste Físico de Inventario / Merma',
    cuentaContable: '531520 - Pérdida por Diferencia en Conteo',
    cantidadMovimientos: 4,
    totalCantidad: 14,
    unidad: 'UN',
    costoTotalCOP: 3900000,
    porcentajeParticipacion: '2.9%'
  },
  {
    concepto: 'Despacho Venta Directa Mostrador',
    cuentaContable: '613501 - Costo de Ventas',
    cantidadMovimientos: 32,
    totalCantidad: 180,
    unidad: 'UN',
    costoTotalCOP: 35000000,
    porcentajeParticipacion: '25.9%'
  }
];
