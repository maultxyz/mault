import { csvEscape, type ExportAdapter } from "./base";

export const tcgplayerAdapter: ExportAdapter = {
  key: "tcgplayer",
  label: "TCGPlayer",
  filenameSlug: "tcgplayer",
  groupBy: "card",
  games: "all",
  headers: () => [
    "Quantity",
    "Name",
    "Set Name",
    "Number",
    "Condition",
    "Printing",
    "Language",
  ],
  row: ({ card, quantity }) => [
    String(quantity),
    csvEscape(card.name),
    csvEscape(card.setName),
    card.collectorNumber,
    "Near Mint",
    "Normal",
    "English",
  ],
};
