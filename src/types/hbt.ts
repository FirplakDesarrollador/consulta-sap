/** Tipos de Localización HBT (tablas de usuario @HBT_* / @BPCO_* / @HEIN_*, campos HBT de socios, retenciones y documentos) */

export type HbtFieldKind = 'text' | 'longtext' | 'int' | 'number' | 'date' | 'time';

/**
 * Operaciones permitidas sobre una tabla de usuario:
 *  - crud: crear, modificar y eliminar (catálogos)
 *  - config: igual que crud, pero la tabla parametriza el comportamiento del complemento (se avisa en pantalla)
 *  - patch: solo modificar registros existentes (configuración de una sola fila / series)
 *  - readonly: solo lectura (registros transaccionales, bitácoras y parámetros con credenciales)
 */
export type HbtMode = 'crud' | 'config' | 'patch' | 'readonly';

export interface HbtCategoryInfo {
  id: string;
  label: string;
  description: string;
}

export interface HbtTableInfo {
  name: string;
  description: string;
  category: string;
  mode: HbtMode;
  /** Conjunto de entidades del Service Layer (U_<tabla>) */
  entity: string;
  /** Filas (solo si se pidió ?counts=1 o ya estaba en caché) */
  count?: number | null;
}

export interface HbtValidValue {
  value: string;
  label: string;
}

export interface HbtFieldDef {
  /** Nombre del campo sin el prefijo U_ (como en UserFieldsMD) */
  name: string;
  /** Propiedad en el Service Layer: U_<name> */
  sap: string;
  label: string;
  kind: HbtFieldKind;
  size: number;
  mandatory: boolean;
  defaultValue: string;
  linkedTable: string;
  validValues: HbtValidValue[];
  /** Campo con credenciales / claves: nunca se lee ni se escribe */
  secret: boolean;
}

export type HbtValue = string | number | null;

export interface HbtRecord {
  code: string;
  name: string;
  fields: Record<string, HbtValue>;
  /** Campos secretos con valor (solo se informa que existen) */
  hiddenFields?: string[];
}

export interface HbtTableSchema {
  table: HbtTableInfo;
  fields: HbtFieldDef[];
  warnings: string[];
}

export interface HbtPartnerRow {
  cardCode: string;
  cardName: string;
  cardType: string;
  federalTaxId: string;
  active: boolean;
  fields: Record<string, HbtValue>;
}

export interface HbtPartnerDetail extends HbtPartnerRow {
  subjectToWithholding: string;
  defaultWtCode: string;
  withholdingCodes: string[];
  hiddenFields: string[];
}

export interface HbtWithholdingRow {
  wtCode: string;
  wtName: string;
  category: string;
  baseType: string;
  baseAmount: number | null;
  rate: number | null;
  officialCode: string;
  account: string;
  withholdingType: string;
  effectiveFrom: string;
  inactive: boolean;
  fields: Record<string, HbtValue>;
}

export type HbtDocType = 'invoices' | 'credit-notes' | 'purchase-invoices' | 'purchase-credit-notes' | 'delivery-notes';

export interface HbtEInvoiceRow {
  docEntry: number;
  docNum: number;
  docDate: string;
  cardCode: string;
  cardName: string;
  docTotal: number;
  currency: string;
  cancelled: boolean;
  statusCode: number | null;
  statusLabel: string;
  statusDetail: string;
  sentDate: string;
  answerDate: string;
  responseCode: string;
  dianCode: number | null;
  deliveryCode: number | null;
  invoiceType: string;
  operationType: string;
}

export interface HbtEInvoiceSummary {
  type: HbtDocType;
  total: number;
  byStatus: { code: number; label: string; count: number }[];
}
