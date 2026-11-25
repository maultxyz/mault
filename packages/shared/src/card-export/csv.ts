import { isCardPriceField } from "../card-price-sort";
import {
  GENERIC_CSV_PRIMARY_PRICE_COLUMN,
  PRICE_SOURCE_EXPORT_LABELS,
} from "../constants/card-export.constant";
import { PRICE_SOURCE_FIELDS } from "../constants/price-source.constant";
import { getCardValue } from "../evaluate-bin";
import { cardPriceFor } from "../price-source";
import { conditionLabel, csvEscape, finishLabel } from "./base";
import type {
  ExportAdapter,
  ExportContext,
  GroupedEntry,
} from "../interfaces/card-export.interface";
import type { FieldMeta } from "../interfaces/sort-bins.interface";

function genericCsvColumns(ctx: ExportContext): (FieldMeta | typeof GENERIC_CSV_PRIMARY_PRICE_COLUMN)[] {
  if (!ctx.pricing) return ctx.fieldDefinitions;
  const firstPriceFieldIndex = ctx.fieldDefinitions.findIndex(isCardPriceField);
  const otherFields = ctx.fieldDefinitions.filter((field) => !isCardPriceField(field));
  const insertAt = firstPriceFieldIndex === -1 ? otherFields.length : firstPriceFieldIndex;
  return [
    ...otherFields.slice(0, insertAt),
    GENERIC_CSV_PRIMARY_PRICE_COLUMN,
    ...otherFields.slice(insertAt),
  ];
}

function primaryPriceHeader(ctx: ExportContext): string {
  const source = ctx.pricing!.source;
  return `${PRICE_SOURCE_EXPORT_LABELS[source]} Price (${PRICE_SOURCE_FIELDS[source].currency})`;
}

function primaryPriceValue(
  { card, isFoil, foilType, stamp, condition }: GroupedEntry,
  ctx: ExportContext,
): string {
  const price = cardPriceFor(
    card,
    { isFoil, foilType, stamp },
    ctx.pricing!.source,
    condition,
    ctx.pricing!.conditionMultipliers,
  );
  return price == null ? "" : price.toFixed(2);
}

export const csvAdapter: ExportAdapter = {
  key: "csv",
  label: "CSV",
  filenameSlug: "export",
  groupBy: "card-foil",
  games: "all",
  headers: (ctx) => [
    "Quantity",
    "Foil",
    "Foil Type",
    "Finish",
    "Stamp",
    "Condition",
    "Set",
    "Card Number",
    ...genericCsvColumns(ctx).map((column) =>
      csvEscape(column === GENERIC_CSV_PRIMARY_PRICE_COLUMN ? primaryPriceHeader(ctx) : column.label),
    ),
  ],
  row: (entry, ctx) => {
    const { card, quantity, isFoil, foilType, stamp, condition } = entry;
    return [
      String(quantity),
      isFoil ? "True" : "False",
      foilType ? csvEscape(foilType) : "",
      csvEscape(finishLabel(isFoil, foilType)),
      stamp ? csvEscape(stamp) : "",
      conditionLabel(condition),
      card.set.toUpperCase(),
      card.collectorNumber,
      ...genericCsvColumns(ctx).map((column) => {
        if (column === GENERIC_CSV_PRIMARY_PRICE_COLUMN) return primaryPriceValue(entry, ctx);
        const value = getCardValue(card, column.field, ctx.fieldDefinitions);
        if (Array.isArray(value)) return csvEscape(value.join("; "));
        return csvEscape(value === null ? "" : String(value));
      }),
    ];
  },
};
