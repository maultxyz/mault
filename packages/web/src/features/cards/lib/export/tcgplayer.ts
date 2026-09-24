import type { PlayingCard } from "@magic-vault/shared";
import { csvEscape, type ExportAdapter } from "./base";

// Cards scanned before PlayingCard.tcgplayerId existed only carry the ID in
// their stored source payload, under whichever key that source API uses.
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
  row: ({ card, quantity }) => [
    tcgplayerId(card),
    String(quantity),
    csvEscape(card.name),
    csvEscape(card.setName),
    card.collectorNumber,
    "Near Mint",
    "Normal",
    "English",
  ],
};
