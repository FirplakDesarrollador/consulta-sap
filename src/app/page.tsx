'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { VentasView } from '@/components/views/VentasView';
import { ComprasView } from '@/components/views/ComprasView';
import { InventariosView } from '@/components/views/InventariosView';
import { SociosView } from '@/components/views/SociosView';
import { ArticulosView } from '@/components/views/ArticulosView';
import { LocalizacionHBTView } from '@/components/views/LocalizacionHBTView';
import { QueriesView } from '@/components/views/QueriesView';
import { SubModuleId, DocumentRow } from '@/types/sapBusiness';
import {
  mockPedidosVenta,
  mockEntradasMercancia,
  mockOrdenesCompra,
  mockPreciosEntrega,
  mockMovimientosInventario,
  mockSociosNegocio,
  mockArticulos,
  mockHBTGastosExpo
} from '@/data/mockBusinessData';

export default function Home() {
  const [currentSubModule, setCurrentSubModule] = useState<SubModuleId>('ventas_facturas');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server-side state for Facturas
  const [facturas, setFacturas] = useState<DocumentRow[]>([]);
  const [isLoadingFacturas, setIsLoadingFacturas] = useState(true);
  const [facturasError, setFacturasError] = useState<string | null>(null);
  const [serverPage, setServerPage] = useState(1);
  const [serverLimit, setServerLimit] = useState(50);
  const [serverHasMore, setServerHasMore] = useState(false);

  // Filter criteria for server queries
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Other modules states
  const [pedidos, setPedidos] = useState<DocumentRow[]>(mockPedidosVenta);
  const [entradas, setEntradas] = useState<DocumentRow[]>(mockEntradasMercancia);
  const [ordenes, setOrdenes] = useState<DocumentRow[]>(mockOrdenesCompra);
  const [preciosEntrega, setPreciosEntrega] = useState<DocumentRow[]>(mockPreciosEntrega);

  // Fetch real SAP Invoices from server with filters and pagination
  const fetchRealInvoices = useCallback(async (
    page = serverPage,
    limit = serverLimit,
    start = startDate,
    end = endDate,
    search = serverSearchQuery,
    status = statusFilter
  ) => {
    setIsLoadingFacturas(true);
    setFacturasError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      if (search) params.set('search', search);
      if (status && status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/sap/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFacturas(json.data);
        setServerHasMore(Boolean(json.hasMore));
      } else {
        setFacturasError(json.error || 'Error al conectar con SAP Service Layer');
      }
    } catch (err: any) {
      setFacturasError(err.message || 'Error al obtener facturas de SAP');
    } finally {
      setIsLoadingFacturas(false);
    }
  }, [serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter]);

  useEffect(() => {
    fetchRealInvoices(serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter);
  }, [serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter, fetchRealInvoices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRealInvoices(serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter);
    setIsRefreshing(false);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setServerPage(1);
  };

  const handleServerSearchSubmit = (query: string) => {
    setServerSearchQuery(query);
    setServerPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setServerPage(1);
  };

  const handleServerPageChange = (page: number) => {
    setServerPage(page);
  };

  const handleServerLimitChange = (limit: number) => {
    setServerLimit(limit);
    setServerPage(1);
  };

  const handleAddDocument = (doc: DocumentRow) => {
    if (doc.docType === 'Factura') {
      setFacturas((prev) => [doc, ...prev]);
    } else if (doc.docType === 'Pedido') {
      setPedidos((prev) => [doc, ...prev]);
    } else if (doc.docType === 'Entrada Mercancía') {
      setEntradas((prev) => [doc, ...prev]);
    } else if (doc.docType === 'Orden de Compra') {
      setOrdenes((prev) => [doc, ...prev]);
    } else if (doc.docType === 'Precio de Entrega') {
      setPreciosEntrega((prev) => [doc, ...prev]);
    }
  };

  const isVentas =
    currentSubModule === 'ventas_facturas' ||
    currentSubModule === 'ventas_pedidos' ||
    currentSubModule === 'ventas_clientes';

  const isCompras =
    currentSubModule === 'compras_entrada' ||
    currentSubModule === 'compras_orden' ||
    currentSubModule === 'compras_precio_entrega';

  const isInventarios =
    currentSubModule === 'inv_entradas' ||
    currentSubModule === 'inv_salidas' ||
    currentSubModule === 'inv_traslados' ||
    currentSubModule === 'inv_auditoria';

  const isQueries =
    currentSubModule === 'query_costo_pt' ||
    currentSubModule === 'query_facturas_cliente' ||
    currentSubModule === 'query_salidas_concepto';

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        currentSubModule={currentSubModule}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full bg-slate-50">
        {/* Sidebar Nav */}
        <SidebarNav
          currentSubModule={currentSubModule}
          onSelectSubModule={setCurrentSubModule}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* 1. VENTAS */}
          {isVentas && (
            <VentasView
              subModule={currentSubModule as any}
              facturas={facturas}
              pedidos={pedidos}
              clientes={mockSociosNegocio.filter((s) => s.cardType === 'Cliente')}
              onAddDocument={handleAddDocument}
              globalFilter={globalFilter}
              isLoading={currentSubModule === 'ventas_facturas' && isLoadingFacturas}
              errorMessage={currentSubModule === 'ventas_facturas' ? facturasError : null}
              onRetry={() => fetchRealInvoices(serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter)}
              serverPage={serverPage}
              serverLimit={serverLimit}
              serverHasMore={serverHasMore}
              onServerPageChange={handleServerPageChange}
              onServerLimitChange={handleServerLimitChange}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              serverSearchQuery={serverSearchQuery}
              onServerSearchSubmit={handleServerSearchSubmit}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
            />
          )}

          {/* 2. COMPRAS */}
          {isCompras && (
            <ComprasView
              subModule={currentSubModule as any}
              entradas={entradas}
              ordenes={ordenes}
              preciosEntrega={preciosEntrega}
              onAddDocument={handleAddDocument}
              globalFilter={globalFilter}
            />
          )}

          {/* 3. INVENTARIOS */}
          {isInventarios && (
            <InventariosView
              subModule={currentSubModule as any}
              movements={mockMovimientosInventario}
              articulos={mockArticulos}
              globalFilter={globalFilter}
            />
          )}

          {/* 4. SOCIOS DE NEGOCIOS */}
          {currentSubModule === 'socios_maestro' && (
            <SociosView
              socios={mockSociosNegocio}
              globalFilter={globalFilter}
            />
          )}

          {/* 5. MAESTRO DEL ARTÍCULO */}
          {currentSubModule === 'articulos_maestro' && (
            <ArticulosView
              articulos={mockArticulos}
              globalFilter={globalFilter}
            />
          )}

          {/* 6. LOCALIZACIÓN HBT */}
          {currentSubModule === 'hbt_gastos_expo' && (
            <LocalizacionHBTView
              expenses={mockHBTGastosExpo}
              globalFilter={globalFilter}
            />
          )}

          {/* 7. QUERYS PERSONALIZADAS */}
          {isQueries && (
            <QueriesView
              subModule={currentSubModule as any}
              globalFilter={globalFilter}
            />
          )}
        </main>
      </div>
    </div>
  );
}
