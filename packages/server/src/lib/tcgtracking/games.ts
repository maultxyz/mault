import { TCGTRACKING_MTG_COLOR_LETTERS } from "../constants/tcgtracking";
import type { GundamCard } from "../interfaces/gundam";
import type { TcgtrackingGameConfig } from "../interfaces/tcgtracking";
import { collectorNumberKey } from "./keys";

export const TCGTRACKING_GAMES: Record<string, TcgtrackingGameConfig> = {
  mtg: {
    numbering: "per-set",
    fallbacks: false,
    primaryCardIdOf: (product) => product.scryfall_id ?? null,
    colorIdentityOf: (colors) =>
      colors.flatMap((color) => {
        const letter = TCGTRACKING_MTG_COLOR_LETTERS[color];
        return letter ? [letter] : [];
      }),
  },
  onepiece: {
    numbering: "global",
    isBasePrinting: (card) => card.id === card.collectorNumber,
  },
  gundam: {
    numbering: "global",
    numberKeyOf: (card) => {
      const raw = card.raw as GundamCard;
      return raw.card_number ? collectorNumberKey(raw.card_number) : null;
    },
    isBasePrinting: (card) => {
      const raw = card.raw as GundamCard;
      return !raw.product_id || raw.product_id === raw.card_number;
    },
  },
  fab: { numbering: "global" },
  pokemon: { numbering: "per-set" },
  lorcana: { numbering: "per-set" },
  riftbound: { numbering: "per-set" },
  swu: { numbering: "per-set" },
  grandarchive: { numbering: "per-set" },
  cyberpunk: { numbering: "per-set" },
  yugioh: { numbering: "name-only" },
};
