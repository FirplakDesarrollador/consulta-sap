import { NextResponse } from 'next/server';
import { querySapServiceLayer } from '@/lib/sapClient';
import {
  mockFacturasVenta,
  mockPedidosVenta,
  mockEntradasMercancia,
  mockOrdenesCompra,
  mockPreciosEntrega,
  mockMovimientosInventario,
  mockSociosNegocio,
  mockArticulos,
  mockHBTGastosExpo
} from '@/data/mockBusinessData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity') || 'Invoices';
  const top = searchParams.get('top') || '50';
  const skip = searchParams.get('skip') || '0';
  const filter = searchParams.get('filter');
  const orderby = searchParams.get('orderby');

  const params: Record<string, string> = {
    '$top': top,
    '$skip': skip
  };

  if (filter) params['$filter'] = filter;
  if (orderby) params['$orderby'] = orderby;

  // Attempt real Service Layer query
  const sapResult = await querySapServiceLayer(entity, { params });

  if (sapResult.success && sapResult.data) {
    return NextResponse.json({
      success: true,
      source: 'SAP_SERVICE_LAYER',
      entity,
      total: sapResult.total,
      data: sapResult.data,
      timestamp: new Date().toISOString()
    });
  }

  // Fallback to local dataset if offline or restricted by VPN/firewall
  let fallbackData: any[] = [];
  if (entity.toLowerCase().includes('invoice') || entity === 'OINV') {
    fallbackData = mockFacturasVenta;
  } else if (entity.toLowerCase().includes('order') || entity === 'ORDR') {
    fallbackData = mockPedidosVenta;
  } else if (entity.toLowerCase().includes('purchasedelivery') || entity === 'OPDN') {
    fallbackData = mockEntradasMercancia;
  } else if (entity.toLowerCase().includes('purchaseorder') || entity === 'OPOR') {
    fallbackData = mockOrdenesCompra;
  } else if (entity.toLowerCase().includes('partner') || entity === 'OCRD') {
    fallbackData = mockSociosNegocio;
  } else if (entity.toLowerCase().includes('item') || entity === 'OITM') {
    fallbackData = mockArticulos;
  } else {
    fallbackData = mockMovimientosInventario;
  }

  return NextResponse.json({
    success: true,
    source: 'MOCK_FALLBACK',
    sapError: sapResult.error,
    entity,
    total: fallbackData.length,
    data: fallbackData,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity') || 'Orders';

  try {
    const body = await request.json();
    const result = await querySapServiceLayer(entity, {
      method: 'POST',
      body
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        source: 'SAP_SERVICE_LAYER',
        data: result.data,
        message: 'Documento creado exitosamente en SAP Service Layer'
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error,
      message: 'No se pudo crear el documento en SAP'
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
