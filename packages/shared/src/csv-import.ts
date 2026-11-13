import {
  cleanText,
  conditionFromText,
  foilFromText,
  orderLineIdentity,
  parseCsvRows,
  parsePrice,
  parseQuantity,
  splitShopifyName,
  stripNameSuffix,
} from "./order-import";
import { normalizePickListEntries } from "./pick-list";
import { cardLanguageFromText } from "./card-language";
import {
  CSV_IMPORT_FIELDS,
  CSV_IMPORT_HEADER_ALIASES,
  CSV_IMPORT_PRESET_ALIASES,
  CSV_IMPORT_SINGLE_ORDER_DEFAULT_NAME,
} from "./constants/csv-import.constant";
import type { CsvImportPresetKey } from "./constants/csv-import.constant";
import { ORDER_LINE_QUANTITY_MAX, ORDER_LINES_MAX } from "./constants/business.constant";
import type {
  ComposedCsvInventoryRow,
  ComposedCsvOrder,
  ComposedCsvShipment,
  CsvFieldConflict,
  CsvImportField,
  CsvImportMapping,
  CsvImportTable,
  CsvImportType,
  CsvOrderImportResult,
} from "./interfaces/csv-import.interface";
import type { OrderLineInput } from "./interfaces/business.interface";
import type { PickListEntryInput } from "./interfaces/pick-list.interface";

export function parseCsvTable(text: string): CsvImportTable {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { headers: [], rows: [] };
  return {
    headers: rows[0].map((header) => header.trim()),
    rows: rows.slice(1),
  };
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumnByAliases(
  headers: string[],
  aliases: readonly string[],
): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

export function inferCsvMapping(
  type: CsvImportType,
  headers: string[],
): CsvImportMapping {
  const columns: Partial<Record<CsvImportField, number>> = {};
  for (const spec of CSV_IMPORT_FIELDS[type]) {
    const index = findColumnByAliases(
      headers,
      CSV_IMPORT_HEADER_ALIASES[spec.key],
    );
    if (index !== -1) columns[spec.key] = index;
  }
  if (type === "orders") {
    const normalized = headers.map(normalizeHeader);
    if (columns.name !== undefined && columns.orderRef === undefined) {
      const nameAlias =
        columns.name !== undefined ? normalized[columns.name] : undefined;
      if (nameAlias === "lineitem name" && normalized.includes("name")) {
        columns.orderRef = normalized.indexOf("name");
      }
    }
  }
  return { type, columns, composition: "single", singleOrderName: null };
}

export function inferCsvMappingForPreset(
  type: CsvImportType,
  headers: string[],
  preset: CsvImportPresetKey,
): CsvImportMapping {
  if (preset === "tcgplayer") return inferCsvMapping(type, headers);
  const presetAliases = CSV_IMPORT_PRESET_ALIASES[preset];
  const columns: Partial<Record<CsvImportField, number>> = {};
  for (const spec of CSV_IMPORT_FIELDS[type]) {
    const aliases =
      presetAliases[spec.key] ?? CSV_IMPORT_HEADER_ALIASES[spec.key];
    const index = findColumnByAliases(headers, aliases);
    if (index !== -1) columns[spec.key] = index;
  }
  return { type, columns, composition: "single", singleOrderName: null };
}

export function missingRequiredCsvFields(
  type: CsvImportType,
  mapping: CsvImportMapping,
): CsvImportField[] {
  return CSV_IMPORT_FIELDS[type]
    .filter((spec) => spec.required && mapping.columns[spec.key] === undefined)
    .map((spec) => spec.key);
}

function itemFieldKeys(type: CsvImportType): CsvImportField[] {
  return fieldKeysWithScope(type, "item");
}

function orderFieldKeys(type: CsvImportType): CsvImportField[] {
  return fieldKeysWithScope(type, "order");
}

function fieldKeysWithScope(
  type: CsvImportType,
  scope: "order" | "item",
): CsvImportField[] {
  return CSV_IMPORT_FIELDS[type]
    .filter((spec) => spec.scope === scope)
    .map((spec) => spec.key);
}

function cell(row: string[], mapping: CsvImportMapping, field: CsvImportField) {
  const index = mapping.columns[field];
  return index === undefined ? undefined : row[index];
}

function hasAnyValue(
  row: string[],
  mapping: CsvImportMapping,
  fields: CsvImportField[],
): boolean {
  return fields.some(
    (field) => (cell(row, mapping, field) ?? "").trim() !== "",
  );
}

export function inferComposition(
  rows: string[][],
  mapping: CsvImportMapping,
): CsvImportMapping["composition"] {
  if (mapping.type !== "orders") return "single";
  const itemFields = itemFieldKeys("orders");
  const orderFields = orderFieldKeys("orders").filter((f) => f !== "orderRef");
  const hasOrderRef = mapping.columns.orderRef !== undefined;
  let refFilled = 0;
  let masterRows = 0;
  let itemRows = 0;
  for (const row of rows) {
    if (hasOrderRef && (cell(row, mapping, "orderRef") ?? "").trim() !== "") {
      refFilled++;
    }
    const isItem = hasAnyValue(row, mapping, itemFields);
    if (isItem) {
      itemRows++;
      continue;
    }
    if (hasAnyValue(row, mapping, orderFields) || hasOrderRef) {
      masterRows++;
    }
  }
  if (hasOrderRef && rows.length > 0 && refFilled > rows.length / 2 && itemRows > 0) {
    return "reference";
  }
  if (masterRows > 0 && itemRows > 0) return "master-detail";
  return "single";
}

interface OrderFieldAccumulator {
  reference: string | null;
  fields: Record<ComposedOrderField, string | null>;
}

const COMPOSED_ORDER_FIELDS = [
  "customerName",
  "customerContact",
  "shippingAddress",
  "orderNote",
  "carrier",
  "trackingNumber",
] as const;

type ComposedOrderField = (typeof COMPOSED_ORDER_FIELDS)[number];

function accumulateOrderField(
  order: OrderFieldAccumulator,
  field: ComposedOrderField,
  raw: string | undefined,
  reference: string | null,
  conflicts: CsvFieldConflict[],
) {
  if (raw === undefined) return;
  const value = cleanText(raw);
  if (value === null) return;
  const current = order.fields[field];
  if (current === null) {
    order.fields[field] = value;
  } else if (current !== value) {
    conflicts.push({
      reference,
      field,
      firstValue: current,
      conflictingValue: value,
    });
  }
}

function parseItemLine(
  row: string[],
  mapping: CsvImportMapping,
): OrderLineInput | null {
  const rawName = cleanText(cell(row, mapping, "name"));
  if (!rawName) return null;
  const conditionText = cell(row, mapping, "condition");
  const hasVariantColumns =
    mapping.columns.condition !== undefined || mapping.columns.foil !== undefined;
  const split = hasVariantColumns
    ? null
    : splitShopifyName(rawName);
  const name = split?.name ?? (stripNameSuffix(rawName) || rawName);
  const condition = conditionFromText(conditionText) ?? split?.condition ?? null;
  const foilFromColumn = foilFromText(cell(row, mapping, "foil")) ?? split?.isFoil ?? null;
  const isFoil =
    foilFromColumn ??
    (conditionText && condition === null && /foil/i.test(conditionText) ? true : null);
  return {
    name,
    setCode: cleanText(cell(row, mapping, "setCode")),
    setName: cleanText(cell(row, mapping, "setName")),
    collectorNumber: cleanText(cell(row, mapping, "collectorNumber")),
    condition,
    isFoil,
    language: cardLanguageFromText(cell(row, mapping, "language")),
    quantity: parseQuantity(cell(row, mapping, "quantity")),
    unitPrice: parsePrice(cell(row, mapping, "unitPrice")),
  };
}

function mergeOrderLines(lines: OrderLineInput[]): OrderLineInput[] {
  const merged: OrderLineInput[] = [];
  for (const line of lines) {
    const identity = orderLineIdentity(line);
    const existing = merged.find((l) => orderLineIdentity(l) === identity);
    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + line.quantity,
        ORDER_LINE_QUANTITY_MAX,
      );
    } else {
      merged.push({ ...line });
    }
  }
  return merged.slice(0, ORDER_LINES_MAX);
}

export function composeCsvOrders(
  rows: string[][],
  mapping: CsvImportMapping,
): CsvOrderImportResult {
  const conflicts: CsvFieldConflict[] = [];
  const skippedRows = { count: 0 };
  const groups = new Map<string, { order: OrderFieldAccumulator; lines: OrderLineInput[] }>();

  const groupFor = (key: string): { order: OrderFieldAccumulator; lines: OrderLineInput[] } => {
    let group = groups.get(key);
    if (!group) {
      group = {
        order: {
          reference: null,
          fields: {
            customerName: null,
            customerContact: null,
            shippingAddress: null,
            orderNote: null,
            carrier: null,
            trackingNumber: null,
          },
        },
        lines: [],
      };
      groups.set(key, group);
    }
    return group;
  };

  const accumulateOrderFields = (
    row: string[],
    group: { order: OrderFieldAccumulator; lines: OrderLineInput[] },
    reference: string | null,
  ) => {
    for (const field of COMPOSED_ORDER_FIELDS) {
      accumulateOrderField(group.order, field, cell(row, mapping, field), reference, conflicts);
    }
  };

  if (mapping.composition === "single") {
    const group = groupFor("single");
    group.order.reference = cleanText(mapping.singleOrderName ?? undefined) ??
      CSV_IMPORT_SINGLE_ORDER_DEFAULT_NAME;
    for (const row of rows) {
      const line = parseItemLine(row, mapping);
      if (!line) {
        if (hasAnyValue(row, mapping, orderFieldKeys("orders"))) {
          accumulateOrderFields(row, group, group.order.reference);
        } else {
          skippedRows.count++;
        }
        continue;
      }
      group.lines.push(line);
    }
  } else if (mapping.composition === "reference") {
    for (const row of rows) {
      const reference = cleanText(cell(row, mapping, "orderRef"));
      const line = parseItemLine(row, mapping);
      if (!line) {
        if (hasAnyValue(row, mapping, orderFieldKeys("orders"))) {
          const group = groupFor(reference ?? `\u0000empty`);
          if (reference) group.order.reference = reference;
          accumulateOrderFields(row, group, reference);
        } else {
          skippedRows.count++;
        }
        continue;
      }
      const group = groupFor(reference ?? `\u0000empty`);
      if (reference) group.order.reference = reference;
      accumulateOrderFields(row, group, reference);
      group.lines.push(line);
    }
  } else {
    let currentKey: string | null = null;
    let masterIndex = 0;
    const orderFields = orderFieldKeys("orders");
    for (const row of rows) {
      const isItem = hasAnyValue(row, mapping, itemFieldKeys("orders"));
      if (!isItem) {
        if (hasAnyValue(row, mapping, orderFields)) {
          const reference = cleanText(cell(row, mapping, "orderRef"));
          currentKey = reference ?? `#master-${masterIndex++}`;
          const group = groupFor(currentKey);
          if (reference) group.order.reference = reference;
          accumulateOrderFields(row, group, reference);
        } else {
          skippedRows.count++;
        }
        continue;
      }
      if (currentKey === null) {
        currentKey = "#master-0";
        masterIndex = 1;
      }
      const group = groupFor(currentKey);
      accumulateOrderFields(row, group, group.order.reference);
      const line = parseItemLine(row, mapping);
      if (!line) {
        skippedRows.count++;
        continue;
      }
      group.lines.push(line);
    }
  }

  const orders: ComposedCsvOrder[] = [];
  let emptyOrders = 0;
  for (const { order, lines } of groups.values()) {
    const merged = mergeOrderLines(lines);
    if (merged.length === 0) {
      emptyOrders++;
      continue;
    }
    orders.push({ reference: order.reference, ...order.fields, lines: merged });
  }
  return { orders, skippedRows: skippedRows.count, emptyOrders, conflicts };
}

export function composeCsvPickEntries(
  rows: string[][],
  mapping: CsvImportMapping,
): { entries: PickListEntryInput[]; skippedRows: number } {
  const entries: PickListEntryInput[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const name = cleanText(cell(row, mapping, "name"));
    if (!name) {
      skippedRows++;
      continue;
    }
    entries.push({
      name: stripNameSuffix(name) || name,
      quantity: parseQuantity(cell(row, mapping, "quantity")),
    });
  }
  return { entries: normalizePickListEntries(entries), skippedRows };
}

export function composeCsvInventoryRows(
  rows: string[][],
  mapping: CsvImportMapping,
): { rows: ComposedCsvInventoryRow[]; skippedRows: number } {
  const composed: ComposedCsvInventoryRow[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const name = cleanText(cell(row, mapping, "name"));
    if (!name) {
      skippedRows++;
      continue;
    }
    composed.push({
      name: stripNameSuffix(name) || name,
      setCode: cleanText(cell(row, mapping, "setCode")),
      setName: cleanText(cell(row, mapping, "setName")),
      collectorNumber: cleanText(cell(row, mapping, "collectorNumber")),
      condition: conditionFromText(cell(row, mapping, "condition")),
      isFoil: foilFromText(cell(row, mapping, "foil")),
      language: cardLanguageFromText(cell(row, mapping, "language")),
      quantity: parseQuantity(cell(row, mapping, "quantity")),
      storageLocation: cleanText(cell(row, mapping, "storageLocation")),
    });
  }
  return { rows: composed, skippedRows };
}

export function composeCsvShipments(
  rows: string[][],
  mapping: CsvImportMapping,
): { shipments: ComposedCsvShipment[]; skippedRows: number } {
  const shipments: ComposedCsvShipment[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const orderRef = cleanText(cell(row, mapping, "orderRef"));
    if (!orderRef) {
      skippedRows++;
      continue;
    }
    shipments.push({
      orderRef,
      carrier: cleanText(cell(row, mapping, "carrier")),
      trackingNumber: cleanText(cell(row, mapping, "trackingNumber")),
      labelUrl: cleanText(cell(row, mapping, "labelUrl")),
      shippedDate: cleanText(cell(row, mapping, "shippedDate")),
    });
  }
  return { shipments, skippedRows };
}
