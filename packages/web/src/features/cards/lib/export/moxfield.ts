import { csvEscape, purchasePrice, type ExportAdapter } from "./base";

export const moxfieldAdapter: ExportAdapter = {
  key: "moxfield",
  label: "Moxfield",
  filenameSlug: "moxfield",
  groupBy: "card-foil",
  games: ["mtg"],
  headers: () => [
    "Count",
    "Name",
    "Edition",
    "Condition",
    "Language",
    "Foil",
    "Collector Number",
    "Alter",
    "Proxy",
    "Purchase Price (USD)",
  ],
  row: ({ card, quantity, isFoil }) => [
    String(quantity),
    csvEscape(card.name),
    card.set.toUpperCase(),
    "Near Mint",
    "EN",
    isFoil ? "foil" : "",
    card.collectorNumber,
    "False",
    "False",
    purchasePrice(card, isFoil),
  ],
};
