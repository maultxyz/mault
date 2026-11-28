import { conditionLabel, csvEscape, finishLabel } from "./card-export/base";
import {
  CARD_SKU_CHECK_ALPHABET,
  CARD_SKU_CHECK_BITS_PER_CHARACTER,
  CARD_SKU_CHECK_LENGTH,
  CARD_SKU_FALLBACK_GAME_PREFIX_LENGTH,
  CARD_SKU_FOIL_CODE,
  CARD_SKU_FOIL_TYPE_CODE_MAX_LENGTH,
  CARD_SKU_GAME_PREFIXES,
  CARD_SKU_NONFOIL_CODE,
  CARD_SKU_SEPARATOR,
  SHOPIFY_DEFAULT_OPTION_NAME,
  SHOPIFY_DEFAULT_OPTION_VALUE,
  SHOPIFY_PRODUCT_TYPE,
  SQUARE_DEFAULT_VARIATION_NAME,
} from "./constants/pos-export.constant";
import type {
  CardSkuInput,
  PosExportContext,
  PosExportFormat,
  PosExportGrouped,
  PosExportItem,
  PosExportPricedCopy,
} from "./interfaces/pos-export.interface";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function skuSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function skuGamePrefix(gameKey: string): string {
  return (
    CARD_SKU_GAME_PREFIXES[gameKey] ??
    skuSegment(gameKey).slice(0, CARD_SKU_FALLBACK_GAME_PREFIX_LENGTH)
  );
}

function skuFinishCode(isFoil: boolean, foilType: string | null): string {
  if (!isFoil) return CARD_SKU_NONFOIL_CODE;
  const words = (foilType ?? "").split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0 || (words.length === 1 && skuSegment(words[0]) === "FOIL")) {
    return CARD_SKU_FOIL_CODE;
  }
  return words
    .map((word) => word[0].toUpperCase())
    .join("")
    .slice(0, CARD_SKU_FOIL_TYPE_CODE_MAX_LENGTH);
}

function fnv1a(text: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

function skuCheckCode(input: CardSkuInput): string {
  let hash = fnv1a([input.gameKey, input.cardId, input.foilType ?? "", input.stamp ?? ""].join("|"));
  let code = "";
  for (let index = 0; index < CARD_SKU_CHECK_LENGTH; index++) {
    code += CARD_SKU_CHECK_ALPHABET[hash & (CARD_SKU_CHECK_ALPHABET.length - 1)];
    hash >>>= CARD_SKU_CHECK_BITS_PER_CHARACTER;
  }
  return code;
}

export function buildCardSku(input: CardSkuInput): string {
  return [
    skuGamePrefix(input.gameKey),
    skuSegment(input.setCode),
    skuSegment(input.collectorNumber),
    skuSegment(input.language),
    skuFinishCode(input.isFoil, input.foilType),
    input.condition,
    skuCheckCode(input),
  ]
    .filter(Boolean)
    .join(CARD_SKU_SEPARATOR);
}

export function groupPosExportItems<Copy extends PosExportPricedCopy>(
  copies: Copy[],
): PosExportGrouped<Copy>[] {
  const itemsBySku = new Map<string, PosExportGrouped<Copy>>();
  for (const copy of copies) {
    const item = itemsBySku.get(copy.sku);
    if (!item) {
      itemsBySku.set(copy.sku, { ...copy, quantity: 1, hasMixedPrices: false });
      continue;
    }
    item.quantity += 1;
    if (item.price !== copy.price) item.hasMixedPrices = true;
  }
  return [...itemsBySku.values()];
}

function posItemTitle(item: PosExportItem): string {
  const printing = [item.setCode.toUpperCase(), item.collectorNumber && `#${item.collectorNumber}`]
    .filter(Boolean)
    .join(" ");
  return [
    printing ? `${item.name} (${printing})` : item.name,
    finishLabel(item.isFoil, item.foilType),
    conditionLabel(item.condition),
    item.language.toUpperCase(),
  ].join(" - ");
}

function posItemDescription(item: PosExportItem): string {
  return [
    item.setName,
    item.collectorNumber && `#${item.collectorNumber}`,
    conditionLabel(item.condition),
    finishLabel(item.isFoil, item.foilType),
    item.language.toUpperCase(),
  ]
    .filter(Boolean)
    .join(", ");
}

function posPrice(item: PosExportItem): string {
  return item.price === null ? "" : item.price.toFixed(2);
}

function shopifyRows(items: PosExportItem[]): string[][] {
  const header = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Variant SKU",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Variant Barcode",
    "Image Src",
    "Gift Card",
    "Status",
  ];
  return [
    header,
    ...items.map((item) => [
      item.sku.toLowerCase(),
      posItemTitle(item),
      "",
      item.gameName,
      "",
      SHOPIFY_PRODUCT_TYPE,
      [item.gameName, item.setName].filter(Boolean).join(", "),
      "TRUE",
      SHOPIFY_DEFAULT_OPTION_NAME,
      SHOPIFY_DEFAULT_OPTION_VALUE,
      item.sku,
      "shopify",
      String(item.quantity),
      "deny",
      "manual",
      posPrice(item),
      "TRUE",
      "TRUE",
      item.sku,
      item.imageUrl ?? "",
      "FALSE",
      "active",
    ]),
  ];
}

function squareRows(items: PosExportItem[]): string[][] {
  return [
    ["Token", "Item Name", "Variation Name", "SKU", "Description", "Category", "Price", "Sellable", "Stockable"],
    ...items.map((item) => [
      "",
      posItemTitle(item),
      SQUARE_DEFAULT_VARIATION_NAME,
      item.sku,
      posItemDescription(item),
      item.gameName,
      posPrice(item),
      "Y",
      "Y",
    ]),
  ];
}

function skuRows(items: PosExportItem[], context: PosExportContext): string[][] {
  return [
    [
      "SKU",
      "Barcode",
      "Name",
      "Game",
      "Set",
      "Set Code",
      "Card Number",
      "Condition",
      "Finish",
      "Language",
      "Price",
      "Currency",
      "Quantity",
    ],
    ...items.map((item) => [
      item.sku,
      item.sku,
      item.name,
      item.gameName,
      item.setName,
      item.setCode.toUpperCase(),
      item.collectorNumber,
      conditionLabel(item.condition),
      finishLabel(item.isFoil, item.foilType),
      item.language.toUpperCase(),
      posPrice(item),
      context.currency,
      String(item.quantity),
    ]),
  ];
}

const POS_EXPORT_ROW_BUILDERS: Record<
  PosExportFormat,
  (items: PosExportItem[], context: PosExportContext) => string[][]
> = {
  shopify: shopifyRows,
  square: squareRows,
  sku: skuRows,
};

export function buildPosExportCsv(
  format: PosExportFormat,
  items: PosExportItem[],
  context: PosExportContext,
): string {
  return POS_EXPORT_ROW_BUILDERS[format](items, context)
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}
