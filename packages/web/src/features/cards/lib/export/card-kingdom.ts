import { csvEscape, type ExportAdapter } from "./base";

export const cardKingdomAdapter: ExportAdapter = {
  key: "cardkingdom",
  label: "Card Kingdom Buylist",
  filenameSlug: "cardkingdom",
  groupBy: "card-foil",
  games: ["mtg"],
  headers: () => ["Title", "Edition", "Foil", "Quantity"],
  row: ({ card, quantity, isFoil }) => [
    csvEscape(card.name),
    csvEscape(card.setName),
    isFoil ? "True" : "False",
    String(quantity),
  ],
};
