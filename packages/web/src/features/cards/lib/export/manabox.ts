import { csvEscape, purchasePrice, type ExportAdapter } from "./base";

export const manaboxAdapter: ExportAdapter = {
  key: "manabox",
  label: "Manabox",
  filenameSlug: "manabox",
  groupBy: "card-foil",
  games: ["mtg"],
  headers: () => [
    "Name",
    "Set code",
    "Set name",
    "Collector number",
    "Foil",
    "Quantity",
    "Scryfall ID",
    "Condition",
    "Language",
    "Purchase price (USD)",
  ],
  row: ({ card, quantity, isFoil }) => [
    csvEscape(card.name),
    card.set.toUpperCase(),
    csvEscape(card.setName),
    card.collectorNumber,
    isFoil ? "foil" : "",
    String(quantity),
    card.id,
    "Near Mint",
    "en",
    purchasePrice(card, isFoil),
  ],
};
