'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Layers,
  Coins,
  ShieldCheck,
  Building,
  HelpCircle
} from 'lucide-react';
import { SapPriceList, ItemPriceRow } from '@/types/sapBusiness';
import { EditPriceModal } from '../modals/EditPriceModal';

interface ListasPreciosViewProps {
  globalFilter?: string;
}

export const ListasPreciosView: React.FC<ListasPreciosViewProps> = ({ globalFilter = '' }) => {
  const [priceLists, setPriceLists] = useState<SapPriceList[]>([]);
  const [selectedListNo, setSelectedListNo] = useState<number>(1);
  const [selectedList, setSelectedList] = useState<SapPriceList | null>(null);

  const [items, setItems] = useState<ItemPriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(globalFilter || '');
  const [debouncedSearch, setDebouncedSearch] = useState(globalFilter || '');
  const [priceFilter, setPriceFilter] = useState<'WITH_PRICE' | 'ALL' | 'ZERO_PRICE'>('WITH_PRICE');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ItemPriceRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize when globalFilter prop updates from Header
  useEffect(() => {
    if (globalFilter !== undefined) {
      setSearchQuery(globalFilter);
      setDebouncedSearch(globalFilter);
      setPage(1);
    }
  }, [globalFilter]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch price lists and items
  const fetchPriceListData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        priceListNo: String(selectedListNo),
        page: String(page),
        limit: String(limit)
      });

      if (priceFilter === 'WITH_PRICE') {
        params.set('withPrice', 'true');
      }

      const effectiveSearch = debouncedSearch.trim();
      if (effectiveSearch) {
        params.set('search', effectiveSearch);
      }

      const res = await fetch(`/api/sap/price-lists?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        if (json.priceLists && json.priceLists.length > 0) {
          setPriceLists(json.priceLists);
        }
        if (json.selectedPriceList) {
          setSelectedList(json.selectedPriceList);
        }
        setItems(json.items || []);
        setHasMore(Boolean(json.hasMore));
      } else {
        setError(json.error || 'Error al obtener la lista de precios de SAP');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListNo, page, limit, debouncedSearch, priceFilter]);

  useEffect(() => {
    fetchPriceListData();
  }, [fetchPriceListData]);

  const handlePriceListChange = (newNo: number) => {
    setSelectedListNo(newNo);
    setPriceFilter('WITH_PRICE');
    setPage(1);
  };

  const handleOpenEdit = (item: ItemPriceRow) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = (updatedPrice: number) => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((it) => (it.itemCode === editingItem.itemCode ? { ...it, price: updatedPrice } : it))
    );
    setToastMessage(`Precio actualizado para el artículo ${editingItem.itemCode}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Client-side filter for quick zero/non-zero toggles
  const displayItems = items.filter((it) => {
    if (priceFilter === 'WITH_PRICE') return it.price > 0;
    if (priceFilter === 'ZERO_PRICE') return it.price === 0;
    return true;
  });

  const countWithPrice = items.filter((i) => i.price > 0).length;

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slideUp">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-md shadow-purple-500/20">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">Listas de Precios (OPLN - SAP)</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {priceLists.length > 0 ? `${priceLists.length} Listas Configuradas` : 'SAP B1'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta de tarifas de venta y compra, factores de margen y actualización en directo por Service Layer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPriceListData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Recargar datos de SAP"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Price List Selector & Metadata Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Price List Dropdown */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Seleccionar Lista de Precios
            </label>
            <select
              value={selectedListNo}
              onChange={(e) => handlePriceListChange(Number(e.target.value))}
              disabled={isLoading && priceLists.length === 0}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
            >
              {priceLists.map((pl) => (
                <option key={pl.priceListNo} value={pl.priceListNo}>
                  #{pl.priceListNo} - {pl.priceListName} ({pl.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Currency & Tax */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Moneda / Impuesto</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono font-bold text-slate-900 text-sm">
                {selectedList?.currency || 'COP'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedList?.isGrossPrice ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedList?.isGrossPrice ? 'Precio Bruto (c/IVA)' : 'Precio Neto (s/IVA)'}
              </span>
            </div>
          </div>

          {/* Base List & Factor */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Lista Base / Factor</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-700 font-medium">
                Base: <strong className="font-mono text-slate-900">#{selectedList?.basePriceList || 1}</strong>
              </span>
              <span className="font-mono font-bold text-purple-700 text-xs bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                x{selectedList?.factor || 1.0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex-1 min-w-[260px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setDebouncedSearch(searchQuery);
                setPage(1);
              }
            }}
            placeholder="Buscar por código o descripción del artículo (presiona Enter)..."
            className="w-full text-xs px-3 py-2 pl-9 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition text-slate-900 placeholder:text-slate-400"
          />
          {isLoading && searchQuery ? (
            <Loader2 className="h-4 w-4 text-purple-600 animate-spin absolute left-3 top-2.5" />
          ) : (
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          )}
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearch('');
                setPage(1);
              }}
              title="Limpiar búsqueda"
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1 hidden sm:inline">
            Mostrar:
          </span>
          <button
            onClick={() => {
              setPriceFilter('WITH_PRICE');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5 ${
              priceFilter === 'WITH_PRICE'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Con Precio</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
              priceFilter === 'WITH_PRICE' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {priceFilter === 'WITH_PRICE' ? items.length : countWithPrice}
            </span>
          </button>

          <button
            onClick={() => {
              setPriceFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5 ${
              priceFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Todos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
              priceFilter === 'ALL' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {items.length}
            </span>
          </button>

          <button
            onClick={() => {
              setPriceFilter('ZERO_PRICE');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5 ${
              priceFilter === 'ZERO_PRICE'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Sin Tarifa</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
              priceFilter === 'ZERO_PRICE' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {items.length - countWithPrice}
            </span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={fetchPriceListData}
            className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-3 px-4">Código SAP</th>
                <th className="py-3 px-4">Descripción del Artículo</th>
                <th className="py-3 px-4">Grupo</th>
                <th className="py-3 px-4 text-center">Unidad</th>
                <th className="py-3 px-4 text-right">Precio en Lista</th>
                <th className="py-3 px-4 text-center">Factor</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-64"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-10 mx-auto"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-28 ml-auto"></div></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {debouncedSearch.trim() ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-700">
                          No se encontraron artículos que coincidan con &ldquo;{debouncedSearch.trim()}&rdquo;
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          Intenta con otro código, nombre o limpia la búsqueda.
                        </p>
                      </div>
                    ) : (
                      'No se encontraron artículos en esta lista de precios.'
                    )}
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  const hasPrice = item.price > 0;
                  return (
                    <tr key={item.itemCode} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">
                        {item.itemCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.itemName}</div>
                        {item.foreignName && (
                          <div className="text-[10.5px] text-slate-400 truncate max-w-sm">
                            {item.foreignName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {item.groupCode ? `Grp ${item.groupCode}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10.5px] font-semibold">
                          {item.uom || 'UND'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {hasPrice ? (
                          <div className="text-sm font-extrabold text-slate-900">
                            {item.currency} {item.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sin tarifa definida</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                        x{item.factor || 1}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition shadow-2xs group-hover:border-purple-300"
                          title="Actualizar precio de este artículo en SAP"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Artículos por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400 font-mono ml-2">
              Página {page}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold transition flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || isLoading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold transition flex items-center gap-1 disabled:opacity-40"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Price Modal */}
      {isEditModalOpen && editingItem && selectedList && (
        <EditPriceModal
          item={editingItem}
          priceList={selectedList}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
