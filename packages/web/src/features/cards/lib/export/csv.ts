import { getCardValue } from "@magic-vault/shared";
import { csvEscape, type ExportAdapter } from "./base";

export const csvAdapter: ExportAdapter = {
  key: "csv",
  label: "CSV",
  filenameSlug: "export",
  groupBy: "card-foil",
  games: "all",
  headers: (ctx) => ["Quantity", "Foil", ...ctx.fieldDefinitions.map((f) => f.label)],
  row: ({ card, quantity, isFoil }, ctx) => [
    String(quantity),
    isFoil ? "True" : "False",
    ...ctx.fieldDefinitions.map((f) => {
      const value = getCardValue(card, f.field, ctx.fieldDefinitions);
      if (Array.isArray(value)) return csvEscape(value.join("; "));
      return csvEscape(value === null ? "" : String(value));
    }),
  ],
};
