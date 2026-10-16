import type { PlayingCard } from "../interfaces/card.interface";
import { conditionLabel, csvEscape } from "./base";
import type { ExportAdapter } from "../interfaces/card-export.interface";

function tcgplayerId(card: PlayingCard): string {
  if (card.tcgplayerId) return card.tcgplayerId;
  const raw = card.raw as
    | {
        tcgplayer_id?: string | number | null;
        printing?: { tcgplayer_product_id?: string | null };
      }
    | undefined;
  const legacyId =
    raw?.tcgplayer_id ?? raw?.printing?.tcgplayer_product_id ?? null;
  return legacyId != null ? String(legacyId) : "";
}

export const tcgplayerAdapter: ExportAdapter = {
  key: "tcgplayer",
  label: "TCGPlayer",
  filenameSlug: "tcgplayer",
  groupBy: "card",
  games: "all",
  headers: () => [
    "TCGplayer Id",
    "Quantity",
    "Name",
    "Set Name",
    "Number",
    "Condition",
    "Printing",
    "Language",
  ],
  row: ({ card, quantity, condition }) => [
    tcgplayerId(card),
    String(quantity),
    csvEscape(card.name),
    csvEscape(card.setName),
    card.collectorNumber,
    conditionLabel(condition),
    "Normal",
    "English",
  ],
};
