import { getCardValue } from "../evaluate-bin";
import { conditionLabel, csvEscape } from "./base";
import type { ExportAdapter } from "../interfaces/card-export.interface";

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
    "Condition",
    "Set",
    "Card Number",
    ...ctx.fieldDefinitions.map((f) => csvEscape(f.label)),
  ],
  row: ({ card, quantity, isFoil, foilType, condition }, ctx) => [
    String(quantity),
    isFoil ? "True" : "False",
    foilType ? csvEscape(foilType) : "",
    conditionLabel(condition),
    card.set.toUpperCase(),
    card.collectorNumber,
    ...ctx.fieldDefinitions.map((f) => {
      const value = getCardValue(card, f.field, ctx.fieldDefinitions);
      if (Array.isArray(value)) return csvEscape(value.join("; "));
      return csvEscape(value === null ? "" : String(value));
    }),
  ],
};
