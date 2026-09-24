import { getCardValue } from "@magic-vault/shared";
import { csvEscape, type ExportAdapter } from "./base";

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
    "Set",
    "Card Number",
    ...ctx.fieldDefinitions.map((f) => csvEscape(f.label)),
  ],
  row: ({ card, quantity, isFoil, foilType }, ctx) => [
    String(quantity),
    isFoil ? "True" : "False",
    foilType ? csvEscape(foilType) : "",
    card.set.toUpperCase(),
    card.collectorNumber,
    ...ctx.fieldDefinitions.map((f) => {
      const value = getCardValue(card, f.field, ctx.fieldDefinitions);
      if (Array.isArray(value)) return csvEscape(value.join("; "));
      return csvEscape(value === null ? "" : String(value));
    }),
  ],
};
