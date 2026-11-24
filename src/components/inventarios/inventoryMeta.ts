import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardList, ClipboardCheck, Calculator } from 'lucide-react';
import { InvDocKind, InvHeaderKey, InvStatus } from '@/types/inventory';

/** Metadatos de presentación (cliente) por tipo de documento de inventario */
export type LineMode = 'gen' | 'transfer' | 'counting' | 'posting';

export interface InvMeta {
  title: string;
  label: string;
  plural: string;
  table: string;
  entity: string;
  icon: typeof ArrowDownToLine;
  hasDrafts: boolean;
  lineMode: LineMode;
  statusOptions: InvStatus[];
  createHeader: InvHeaderKey[];
  /** Copiar líneas desde otro documento al crear (traslado ← solicitud, contabilización ← recuento) */
  copyFrom?: { kind: InvDocKind; label: string };
  actionsHelp: string;
}

export const INV_META: Record<InvDocKind, InvMeta> = {
  'goods-entries': {
    title: 'Inventario: Entradas de Mercancía (OIGN - SAP Service Layer)',
    label: 'Entrada de Inventario',
    plural: 'Entradas',
    table: 'OIGN',
    entity: 'InventoryGenEntries',
    icon: ArrowDownToLine,
    hasDrafts: true,
    lineMode: 'gen',
    statusOptions: ['Abierto', 'Cerrado', 'Cancelado'],
    createHeader: ['date', 'reference2', 'journalMemo', 'comments'],
    actionsHelp: 'Crear, consultar, editar comentarios/referencias y cancelar (el SL no permite borrar documentos)'
  },
  'goods-exits': {
    title: 'Inventario: Salidas de Mercancía (OIGE - SAP Service Layer)',
    label: 'Salida de Inventario',
    plural: 'Salidas',
    table: 'OIGE',
    entity: 'InventoryGenExits',
    icon: ArrowUpFromLine,
    hasDrafts: true,
    lineMode: 'gen',
    statusOptions: ['Abierto', 'Cerrado', 'Cancelado'],
    createHeader: ['date', 'reference2', 'journalMemo', 'comments'],
    actionsHelp: 'Crear, consultar, editar comentarios/referencias y cancelar (el SL no permite borrar documentos)'
  },
  transfers: {
    title: 'Inventario: Traslados entre Almacenes (OWTR - SAP Service Layer)',
    label: 'Traslado',
    plural: 'Traslados',
    table: 'OWTR',
    entity: 'StockTransfers',
    icon: ArrowLeftRight,
    hasDrafts: true,
    lineMode: 'transfer',
    statusOptions: ['Abierto', 'Cerrado'],
    createHeader: ['date', 'fromWarehouse', 'toWarehouse', 'reference2', 'journalMemo', 'comments'],
    copyFrom: { kind: 'transfer-requests', label: 'Solicitud de traslado' },
    actionsHelp: 'Crear (directo o desde solicitud), consultar, editar comentarios/referencias y cancelar'
  },
  'transfer-requests': {
    title: 'Inventario: Solicitudes de Traslado (OWTQ - SAP Service Layer)',
    label: 'Solicitud de Traslado',
    plural: 'Solicitudes',
    table: 'OWTQ',
    entity: 'InventoryTransferRequests',
    icon: ClipboardList,
    hasDrafts: true,
    lineMode: 'transfer',
    statusOptions: ['Abierto', 'Cerrado'],
    createHeader: ['date', 'dueDate', 'fromWarehouse', 'toWarehouse', 'reference2', 'journalMemo', 'comments'],
    actionsHelp: 'Crear, consultar, editar (cabecera y líneas abiertas), cerrar y cancelar'
  },
  countings: {
    title: 'Auditoría: Recuentos de Inventario (OINC - SAP Service Layer)',
    label: 'Recuento de Inventario',
    plural: 'Recuentos',
    table: 'OINC',
    entity: 'InventoryCountings',
    icon: ClipboardCheck,
    hasDrafts: false,
    lineMode: 'counting',
    statusOptions: ['Abierto', 'Cerrado'],
    createHeader: ['date', 'reference2', 'comments'],
    actionsHelp: 'Crear, consultar, registrar cantidades contadas y cerrar (el SL/DI no permite borrar recuentos)'
  },
  postings: {
    title: 'Auditoría: Contabilización de Stock (OIQR - SAP Service Layer)',
    label: 'Contabilización de Stock',
    plural: 'Contabilizaciones',
    table: 'OIQR',
    entity: 'InventoryPostings',
    icon: Calculator,
    hasDrafts: false,
    lineMode: 'posting',
    statusOptions: [],
    createHeader: ['date', 'priceSource', 'reference2', 'journalMemo', 'comments'],
    copyFrom: { kind: 'countings', label: 'Recuento de inventario' },
    actionsHelp: 'Crear (directo o desde recuento), consultar y editar comentarios (sin cancelación ni borrado en el SL)'
  }
};

export const HEADER_FIELD_LABEL: Record<InvHeaderKey, string> = {
  date: 'Fecha',
  dueDate: 'Fecha requerida',
  comments: 'Comentarios',
  reference2: 'Referencia 2',
  journalMemo: 'Comentario del asiento',
  fromWarehouse: 'Almacén origen',
  toWarehouse: 'Almacén destino',
  priceSource: 'Fuente de precio'
};

export const PRICE_SOURCE_LABEL: Record<string, string> = {
  ippsLastEvaluatedPrice: 'Último precio evaluado',
  ippsItemCost: 'Costo del artículo',
  ippsByPriceList: 'Lista de precios'
};

export const statusBadgeClass = (status: string) => {
  if (status === 'Cerrado' || status === 'Contabilizado') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'Cancelado') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
};

export const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600';
