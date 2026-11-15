import type {
  CsvImportField,
  CsvImportFieldSpec,
  CsvImportType,
} from "../interfaces/csv-import.interface";
import { ORDER_IMPORT_HEADER_ALIASES } from "./business.constant";

export const CSV_IMPORT_TYPES: readonly CsvImportType[] = [
  "orders",
  "picks",
  "inventory",
  "shipments",
];

export const CSV_IMPORT_HEADER_ALIASES: Record<CsvImportField, readonly string[]> = {
  ...ORDER_IMPORT_HEADER_ALIASES,
  name: ["lineitem name", "item name", ...ORDER_IMPORT_HEADER_ALIASES.name],
  quantity: ["lineitem quantity", "item quantity", ...ORDER_IMPORT_HEADER_ALIASES.quantity],
  unitPrice: ["lineitem price", "item price", ...ORDER_IMPORT_HEADER_ALIASES.unitPrice],
  language: ["language", "lang", "card language", "sprache"],
  customerName: ["customer name", "customer", "buyer name", "buyer", "recipient"],
  customerContact: [
    "customer contact",
    "buyer contact",
    "email",
    "buyer email",
    "customer email",
    "phone",
  ],
  shippingAddress: [
    "shipping address",
    "ship to",
    "shipping address 1",
    "address",
    "address1",
  ],
  orderNote: ["order note", "note", "notes", "comment", "comments"],
  carrier: ["carrier", "shipping carrier", "shipping method", "ship method"],
  trackingNumber: ["tracking number", "tracking", "tracking #", "tracking id"],
  labelUrl: ["label url", "label link", "shipping label", "label"],
  shippedDate: ["shipped date", "ship date", "date shipped", "shipped at"],
  lineNote: ["line item note", "line note", "item note"],
  storageLocation: ["storage location", "location", "storage", "bin location"],
};

export const CSV_IMPORT_FIELDS: Record<CsvImportType, readonly CsvImportFieldSpec[]> = {
  orders: [
    { key: "orderRef", scope: "order" },
    { key: "customerName", scope: "order" },
    { key: "customerContact", scope: "order" },
    { key: "shippingAddress", scope: "order" },
    { key: "orderNote", scope: "order" },
    { key: "carrier", scope: "order" },
    { key: "trackingNumber", scope: "order" },
    { key: "name", scope: "item", required: true },
    { key: "setCode", scope: "item" },
    { key: "setName", scope: "item" },
    { key: "collectorNumber", scope: "item" },
    { key: "condition", scope: "item" },
    { key: "foil", scope: "item" },
    { key: "quantity", scope: "item" },
    { key: "language", scope: "item" },
    { key: "unitPrice", scope: "item" },
    { key: "lineNote", scope: "item" },
  ],
  picks: [
    { key: "name", scope: "item", required: true },
    { key: "setCode", scope: "item" },
    { key: "setName", scope: "item" },
    { key: "quantity", scope: "item" },
  ],
  inventory: [
    { key: "name", scope: "item", required: true },
    { key: "setCode", scope: "item" },
    { key: "setName", scope: "item" },
    { key: "collectorNumber", scope: "item" },
    { key: "quantity", scope: "item" },
    { key: "condition", scope: "item" },
    { key: "foil", scope: "item" },
    { key: "language", scope: "item" },
    { key: "storageLocation", scope: "item" },
  ],
  shipments: [
    { key: "orderRef", scope: "order", required: true },
    { key: "carrier", scope: "order" },
    { key: "trackingNumber", scope: "order" },
    { key: "labelUrl", scope: "order" },
    { key: "shippedDate", scope: "order" },
  ],
};

export const CSV_IMPORT_SINGLE_ORDER_DEFAULT_NAME = "Imported order";

export const CSV_IMPORT_NAME_MAX_LENGTH = 120;

export type CsvImportPresetKey = "shopify" | "tcgplayer";

export const CSV_IMPORT_BUILT_IN_PRESETS: Record<
  CsvImportType,
  readonly CsvImportPresetKey[]
> = {
  orders: ["shopify", "tcgplayer"],
  picks: [],
  inventory: [],
  shipments: [],
};

export const CSV_IMPORT_PRESET_FOR_SOURCE: Record<
  string,
  CsvImportPresetKey
> = {
  shopify: "shopify",
  tcgplayer: "tcgplayer",
};

export const CSV_IMPORT_PRESET_ALIASES: Record<
  CsvImportPresetKey,
  Partial<Record<CsvImportField, readonly string[]>>
> = {
  shopify: {
    name: ["lineitem name"],
    quantity: ["lineitem quantity"],
    unitPrice: ["lineitem price"],
    orderRef: ["name", "order #", "order number", "order", "order id"],
  },
  tcgplayer: {},
};
