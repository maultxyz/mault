import {
  ORDER_CONDITION_PATTERNS,
  ORDER_FOIL_PATTERN,
  ORDER_IMPORT_HEADER_ALIASES,
  ORDER_LINE_QUANTITY_MAX,
  ORDER_LINE_TEXT_MAX_LENGTH,
  ORDER_LINES_MAX,
  ORDER_NON_FOIL_PATTERN,
  SHOPIFY_ORDER_HEADERS,
  TCGPLAYER_DETECT_HEADERS,
} from "./constants/business.constant";
import { DECKLIST_PRINTING_SUFFIX_PATTERN } from "./constants/pick-list.constant";
import type {
  OrderImport,
  OrderLineInput,
  OrderSource,
} from "./interfaces/business.interface";
import type { CardCondition } from "./interfaces/card-condition.interface";
import { isCardCondition } from "./card-condition";
import { parseDecklist } from "./pick-list";

type OrderField = keyof typeof ORDER_IMPORT_HEADER_ALIASES;

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === "," || char === "\t") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function cleanText(value: string | undefined): string | null {
  const text = value?.trim().slice(0, ORDER_LINE_TEXT_MAX_LENGTH);
  return text ? text : null;
}

export function conditionFromText(
  value: string | null | undefined,
): CardCondition | null {
  const text = value?.trim();
  if (!text) return null;
  const upper = text.toUpperCase();
  if (isCardCondition(upper)) return upper;
  return (
    ORDER_CONDITION_PATTERNS.find(({ pattern }) => pattern.test(text))
      ?.condition ?? null
  );
}

function foilFromText(value: string | null | undefined): boolean | null {
  const text = value?.trim();
  if (!text) return null;
  if (/^(true|yes|y|1)$/i.test(text)) return true;
  if (/^(false|no|n|0)$/i.test(text)) return false;
  if (ORDER_NON_FOIL_PATTERN.test(text)) return false;
  if (ORDER_FOIL_PATTERN.test(text)) return true;
  return null;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseQuantity(value: string | undefined): number {
  const parsed = Number.parseInt(value?.replace(/[^0-9]/g, "") ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, ORDER_LINE_QUANTITY_MAX);
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function stripNameSuffix(value: string): string {
  let name = value.trim();
  for (;;) {
    const next = name.replace(DECKLIST_PRINTING_SUFFIX_PATTERN, "").trim();
    if (next === name || !next) return name;
    name = next;
  }
}

function splitShopifyName(value: string): {
  name: string;
  condition: CardCondition | null;
  isFoil: boolean | null;
} {
  const [base, ...variantParts] = value.split(" - ");
  const variant = variantParts.join(" - ");
  return {
    name: stripNameSuffix(base) || value.trim(),
    condition: conditionFromText(variant),
    isFoil: foilFromText(variant),
  };
}

function detectSource(headers: string[]): OrderSource {
  if (headers.includes(SHOPIFY_ORDER_HEADERS.name)) return "shopify";
  if (headers.some((h) => TCGPLAYER_DETECT_HEADERS.includes(h))) {
    return "tcgplayer";
  }
  return "generic";
}

function parseShopifyRows(headers: string[], rows: string[][]) {
  const col = (name: string) => headers.indexOf(name);
  const nameCol = col(SHOPIFY_ORDER_HEADERS.name);
  const qtyCol = col(SHOPIFY_ORDER_HEADERS.quantity);
  const priceCol = col(SHOPIFY_ORDER_HEADERS.unitPrice);
  const orderCol = col(SHOPIFY_ORDER_HEADERS.orderRef);
  const lines: OrderLineInput[] = [];
  let skipped = 0;
  for (const row of rows) {
    const raw = cleanText(row[nameCol]);
    if (!raw) {
      skipped++;
      continue;
    }
    const { name, condition, isFoil } = splitShopifyName(raw);
    lines.push({
      name,
      condition,
      isFoil,
      quantity: parseQuantity(row[qtyCol]),
      unitPrice: parsePrice(row[priceCol]),
      orderRef: cleanText(row[orderCol]),
    });
  }
  return { lines, skipped };
}

function parseMappedRows(headers: string[], rows: string[][]) {
  const columns = Object.fromEntries(
    (Object.keys(ORDER_IMPORT_HEADER_ALIASES) as OrderField[]).map((field) => [
      field,
      findColumn(headers, ORDER_IMPORT_HEADER_ALIASES[field]),
    ]),
  ) as Record<OrderField, number>;
  const cell = (row: string[], field: OrderField) =>
    columns[field] === -1 ? undefined : row[columns[field]];
  const lines: OrderLineInput[] = [];
  let skipped = 0;
  for (const row of rows) {
    const rawName = cleanText(cell(row, "name"));
    const name = rawName ? stripNameSuffix(rawName) : null;
    if (!name) {
      skipped++;
      continue;
    }
    const conditionText = cell(row, "condition");
    lines.push({
      name,
      setCode: cleanText(cell(row, "setCode")),
      setName: cleanText(cell(row, "setName")),
      collectorNumber: cleanText(cell(row, "collectorNumber")),
      condition: conditionFromText(conditionText),
      isFoil:
        foilFromText(cell(row, "foil")) ??
        (conditionText && ORDER_FOIL_PATTERN.test(conditionText) ? true : null),
      quantity: parseQuantity(cell(row, "quantity")),
      unitPrice: parsePrice(cell(row, "unitPrice")),
      orderRef: cleanText(cell(row, "orderRef")),
    });
  }
  return { lines, skipped };
}

function looksLikeCsv(rows: string[][]): boolean {
  if (rows.length < 2 || rows[0].length < 2) return false;
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return findColumn(headers, ORDER_IMPORT_HEADER_ALIASES.name) !== -1 ||
    headers.includes(SHOPIFY_ORDER_HEADERS.name);
}

export function parseOrderImport(text: string): OrderImport {
  const rows = parseCsvRows(text);
  if (!looksLikeCsv(rows)) {
    const lines = parseDecklist(text).map(
      (entry): OrderLineInput => ({ name: entry.name, quantity: entry.quantity }),
    );
    return { source: "generic", lines: lines.slice(0, ORDER_LINES_MAX), skipped: 0 };
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const body = rows.slice(1);
  const source = detectSource(headers);
  const { lines, skipped } =
    source === "shopify"
      ? parseShopifyRows(headers, body)
      : parseMappedRows(headers, body);
  return {
    source,
    lines: lines.slice(0, ORDER_LINES_MAX),
    skipped: skipped + Math.max(lines.length - ORDER_LINES_MAX, 0),
  };
}

export function orderLineLabel(line: OrderLineInput): string {
  const printing = [line.setCode ?? line.setName, line.collectorNumber]
    .filter(Boolean)
    .join(" ");
  return printing ? `${line.name} (${printing})` : line.name;
}
