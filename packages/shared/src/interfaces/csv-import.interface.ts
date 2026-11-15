import type { CardCondition } from "./card-condition.interface";
import type { OrderLineInput } from "./business.interface";

export type CsvImportType = "orders" | "picks" | "inventory" | "shipments";

export type CsvImportComposition = "reference" | "master-detail" | "single";

export type CsvFieldScope = "order" | "item";

export type CsvImportField =
  | "orderRef"
  | "customerName"
  | "customerContact"
  | "shippingAddress"
  | "orderNote"
  | "carrier"
  | "trackingNumber"
  | "labelUrl"
  | "shippedDate"
  | "lineNote"
  | "storageLocation"
  | "name"
  | "setCode"
  | "setName"
  | "collectorNumber"
  | "condition"
  | "foil"
  | "quantity"
  | "unitPrice"
  | "language";

export interface CsvImportFieldSpec {
  key: CsvImportField;
  scope: CsvFieldScope;
  required?: boolean;
}

export interface CsvImportMapping {
  type: CsvImportType;
  columns: Partial<Record<CsvImportField, number>>;
  composition: CsvImportComposition;
  singleOrderName: string | null;
  sourceHeaders?: string[] | null;
}

export interface CsvImportTable {
  headers: string[];
  rows: string[][];
}

export interface ComposedCsvOrder {
  reference: string | null;
  customerName: string | null;
  customerContact: string | null;
  shippingAddress: string | null;
  orderNote: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  lines: OrderLineInput[];
}

export interface CsvFieldConflict {
  reference: string | null;
  field: CsvImportField;
  firstValue: string;
  conflictingValue: string;
}

export interface CsvOrderImportResult {
  orders: ComposedCsvOrder[];
  skippedRows: number;
  emptyOrders: number;
  conflicts: CsvFieldConflict[];
}

export interface ComposedCsvInventoryRow {
  name: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  condition: CardCondition | null;
  isFoil: boolean | null;
  language: string | null;
  quantity: number;
  storageLocation: string | null;
}

export interface ComposedCsvShipment {
  orderRef: string;
  carrier: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  shippedDate: string | null;
}
