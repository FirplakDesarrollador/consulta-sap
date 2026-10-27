'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { VentasView } from '@/components/views/VentasView';
import { PedidosView } from '@/components/views/PedidosView';
import { SociosView } from '@/components/views/SociosView';
import { ListasPreciosView } from '@/components/views/ListasPreciosView';
import { UnderConstructionView } from '@/components/views/UnderConstructionView';
import { ComprasDocumentsView } from '@/components/views/ComprasDocumentsView';
import { LandedCostsView } from '@/components/views/LandedCostsView';
import { InventoryDocumentsView } from '@/components/inventarios/InventoryDocumentsView';
import { StockAuditView } from '@/components/inventarios/StockAuditView';
import { ItemMasterView } from '@/components/articulos/ItemMasterView';
import { SubModuleId, DocumentRow, BusinessPartner } from '@/types/sapBusiness';

export default function Home() {
  const [currentSubModule, setCurrentSubModule] = useState<SubModuleId>('ventas_facturas');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Compras: las vistas consultan SAP por su cuenta; este contador fuerza la recarga desde el Header
  const [comprasRefreshKey, setComprasRefreshKey] = useState(0);
  // Inventarios (excepto Lista de Precios): mismo mecanismo de recarga desde el Header
  const [inventarioRefreshKey, setInventarioRefreshKey] = useState(0);
  // Maestro del Artículo: recarga desde el Header
  const [itemsRefreshKey, setItemsRefreshKey] = useState(0);

  // Server-side state for Facturas
  const [facturas, setFacturas] = useState<DocumentRow[]>([]);
  const [isLoadingFacturas, setIsLoadingFacturas] = useState(true);
  const [facturasError, setFacturasError] = useState<string | null>(null);
  const [serverPage, setServerPage] = useState(1);
  const [serverLimit, setServerLimit] = useState(50);
  const [serverHasMore, setServerHasMore] = useState(false);

  // Filter criteria for server queries (Facturas)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Server-side state for Pedidos de Clientes (ORDR, solo lectura)
  const [pedidos, setPedidos] = useState<DocumentRow[]>([]);
  const [isLoadingPedidos, setIsLoadingPedidos] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);
  const [pedidosPage, setPedidosPage] = useState(1);
  const [pedidosLimit, setPedidosLimit] = useState(50);
  const [pedidosHasMore, setPedidosHasMore] = useState(false);
  const [pedidosStartDate, setPedidosStartDate] = useState('');
  const [pedidosEndDate, setPedidosEndDate] = useState('');
  const [pedidosSearchQuery, setPedidosSearchQuery] = useState('');
  const [pedidosStatusFilter, setPedidosStatusFilter] = useState('ALL');

  // Server-side state for Socios de Negocios
  const [socios, setSocios] = useState<BusinessPartner[]>([]);
  const [isLoadingSocios, setIsLoadingSocios] = useState(false);
  const [sociosError, setSociosError] = useState<string | null>(null);
  const [sociosPage, setSociosPage] = useState(1);
  const [sociosLimit, setSociosLimit] = useState(50);
  const [sociosHasMore, setSociosHasMore] = useState(false);
  const [sociosSearchQuery, setSociosSearchQuery] = useState('');
  const [sociosTypeFilter, setSociosTypeFilter] = useState('ALL');
  const [sociosStatusFilter, setSociosStatusFilter] = useState('ALL');

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

  // Fetch real SAP Sales Orders (ORDR) from server with filters and pagination
  const fetchRealOrders = useCallback(async (
    page = pedidosPage,
    limit = pedidosLimit,
    start = pedidosStartDate,
    end = pedidosEndDate,
    search = pedidosSearchQuery,
    status = pedidosStatusFilter
  ) => {
    setIsLoadingPedidos(true);
    setPedidosError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      if (search) params.set('search', search);
      if (status && status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/sap/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPedidos(json.data);
        setPedidosHasMore(Boolean(json.hasMore));
      } else {
        setPedidosError(json.error || 'Error al conectar con SAP Service Layer');
      }
    } catch (err: unknown) {
      setPedidosError(err instanceof Error ? err.message : 'Error al obtener pedidos de SAP');
    } finally {
      setIsLoadingPedidos(false);
    }
  }, [pedidosPage, pedidosLimit, pedidosStartDate, pedidosEndDate, pedidosSearchQuery, pedidosStatusFilter]);

  // Fetch real SAP Business Partners from server with filters and pagination
  const fetchRealSocios = useCallback(async (
    page = sociosPage,
    limit = sociosLimit,
    search = sociosSearchQuery,
    type = sociosTypeFilter,
    status = sociosStatusFilter
  ) => {
    setIsLoadingSocios(true);
    setSociosError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (search) params.set('search', search);
      if (type && type !== 'ALL') params.set('type', type);
      if (status && status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/sap/business-partners?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSocios(json.data);
        setSociosHasMore(Boolean(json.hasMore));
      } else {
        setSociosError(json.error || 'Error al conectar con SAP Service Layer');
      }
    } catch (err: any) {
      setSociosError(err.message || 'Error al obtener socios de negocio de SAP');
    } finally {
      setIsLoadingSocios(false);
    }
  }, [sociosPage, sociosLimit, sociosSearchQuery, sociosTypeFilter, sociosStatusFilter]);

  useEffect(() => {
    if (currentSubModule === 'ventas_facturas') {
      fetchRealInvoices(serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter);
    } else if (currentSubModule === 'ventas_pedidos') {
      fetchRealOrders(pedidosPage, pedidosLimit, pedidosStartDate, pedidosEndDate, pedidosSearchQuery, pedidosStatusFilter);
    } else if (currentSubModule === 'socios_maestro' || currentSubModule === 'ventas_clientes') {
      fetchRealSocios(sociosPage, sociosLimit, sociosSearchQuery, sociosTypeFilter, sociosStatusFilter);
    }
  }, [
    currentSubModule,
    serverPage,
    serverLimit,
    startDate,
    endDate,
    serverSearchQuery,
    statusFilter,
    fetchRealInvoices,
    pedidosPage,
    pedidosLimit,
    pedidosStartDate,
    pedidosEndDate,
    pedidosSearchQuery,
    pedidosStatusFilter,
    fetchRealOrders,
    sociosPage,
    sociosLimit,
    sociosSearchQuery,
    sociosTypeFilter,
    sociosStatusFilter,
    fetchRealSocios
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (currentSubModule === 'ventas_facturas') {
      await fetchRealInvoices(serverPage, serverLimit, startDate, endDate, serverSearchQuery, statusFilter);
    } else if (currentSubModule === 'ventas_pedidos') {
      await fetchRealOrders(pedidosPage, pedidosLimit, pedidosStartDate, pedidosEndDate, pedidosSearchQuery, pedidosStatusFilter);
    } else if (currentSubModule === 'socios_maestro' || currentSubModule === 'ventas_clientes') {
      await fetchRealSocios(sociosPage, sociosLimit, sociosSearchQuery, sociosTypeFilter, sociosStatusFilter);
    } else if (currentSubModule.startsWith('compras_')) {
      setComprasRefreshKey((k) => k + 1);
    } else if (currentSubModule.startsWith('inv_') && currentSubModule !== 'inv_listas_precios') {
      setInventarioRefreshKey((k) => k + 1);
    } else if (currentSubModule === 'articulos_maestro') {
      setItemsRefreshKey((k) => k + 1);
    }
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
    }
  };

  const handleGlobalFilterChange = (val: string) => {
    setGlobalFilter(val);
    if (currentSubModule === 'ventas_facturas') {
      setServerSearchQuery(val);
      setServerPage(1);
    } else if (currentSubModule === 'ventas_pedidos') {
      setPedidosSearchQuery(val);
      setPedidosPage(1);
    } else if (currentSubModule === 'socios_maestro' || currentSubModule === 'ventas_clientes') {
      setSociosSearchQuery(val);
      setSociosPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        currentSubModule={currentSubModule}
        globalFilter={globalFilter}
        onGlobalFilterChange={handleGlobalFilterChange}
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
          {currentSubModule === 'ventas_facturas' ? (
            <VentasView
              subModule="ventas_facturas"
              facturas={facturas}
              pedidos={[]}
              clientes={[]}
              onAddDocument={handleAddDocument}
              globalFilter={globalFilter}
              isLoading={isLoadingFacturas}
              errorMessage={facturasError}
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
          ) : currentSubModule === 'ventas_pedidos' ? (
            <PedidosView
              pedidos={pedidos}
              isLoading={isLoadingPedidos}
              errorMessage={pedidosError}
              onRetry={() => fetchRealOrders(pedidosPage, pedidosLimit, pedidosStartDate, pedidosEndDate, pedidosSearchQuery, pedidosStatusFilter)}
              serverPage={pedidosPage}
              serverLimit={pedidosLimit}
              serverHasMore={pedidosHasMore}
              onServerPageChange={setPedidosPage}
              onServerLimitChange={(limit) => {
                setPedidosLimit(limit);
                setPedidosPage(1);
              }}
              startDate={pedidosStartDate}
              endDate={pedidosEndDate}
              onDateRangeChange={(start, end) => {
                setPedidosStartDate(start);
                setPedidosEndDate(end);
                setPedidosPage(1);
              }}
              serverSearchQuery={pedidosSearchQuery}
              onServerSearchSubmit={(q) => {
                setPedidosSearchQuery(q);
                setPedidosPage(1);
              }}
              statusFilter={pedidosStatusFilter}
              onStatusFilterChange={(status) => {
                setPedidosStatusFilter(status);
                setPedidosPage(1);
              }}
            />
          ) : currentSubModule === 'socios_maestro' || currentSubModule === 'ventas_clientes' ? (
            <SociosView
              socios={socios}
              globalFilter={globalFilter}
              isLoading={isLoadingSocios}
              errorMessage={sociosError}
              onRetry={() => fetchRealSocios(sociosPage, sociosLimit, sociosSearchQuery, sociosTypeFilter, sociosStatusFilter)}
              serverPage={sociosPage}
              serverLimit={sociosLimit}
              serverHasMore={sociosHasMore}
              onServerPageChange={setSociosPage}
              onServerLimitChange={(limit) => {
                setSociosLimit(limit);
                setSociosPage(1);
              }}
              serverSearchQuery={sociosSearchQuery}
              onServerSearchSubmit={(q) => {
                setSociosSearchQuery(q);
                setSociosPage(1);
              }}
              typeFilter={sociosTypeFilter}
              onTypeFilterChange={(type) => {
                setSociosTypeFilter(type);
                setSociosPage(1);
              }}
              statusFilter={sociosStatusFilter}
              onStatusFilterChange={(status) => {
                setSociosStatusFilter(status);
                setSociosPage(1);
              }}
            />
          ) : currentSubModule === 'inv_listas_precios' ? (
            <ListasPreciosView globalFilter={globalFilter} />
          ) : currentSubModule === 'inv_entradas' ? (
            <InventoryDocumentsView kinds={['goods-entries']} globalFilter={globalFilter} refreshKey={inventarioRefreshKey} />
          ) : currentSubModule === 'inv_salidas' ? (
            <InventoryDocumentsView kinds={['goods-exits']} globalFilter={globalFilter} refreshKey={inventarioRefreshKey} />
          ) : currentSubModule === 'inv_traslados' ? (
            <InventoryDocumentsView kinds={['transfers', 'transfer-requests']} globalFilter={globalFilter} refreshKey={inventarioRefreshKey} />
          ) : currentSubModule === 'inv_auditoria' ? (
            <StockAuditView globalFilter={globalFilter} refreshKey={inventarioRefreshKey} />
          ) : currentSubModule === 'articulos_maestro' ? (
            <ItemMasterView globalFilter={globalFilter} refreshKey={itemsRefreshKey} />
          ) : currentSubModule === 'compras_orden' ? (
            <ComprasDocumentsView kind="purchase-orders" globalFilter={globalFilter} refreshKey={comprasRefreshKey} />
          ) : currentSubModule === 'compras_entrada' ? (
            <ComprasDocumentsView kind="goods-receipts" globalFilter={globalFilter} refreshKey={comprasRefreshKey} />
          ) : currentSubModule === 'compras_precio_entrega' ? (
            <LandedCostsView globalFilter={globalFilter} refreshKey={comprasRefreshKey} />
          ) : (
            <UnderConstructionView
              subModule={currentSubModule}
              onGoToInvoices={() => setCurrentSubModule('ventas_facturas')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
