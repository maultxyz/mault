import type { CardCondition } from "../interfaces/card-condition.interface";

export const CONDITION_EXPORT_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const NONFOIL_FINISH_LABEL = "Normal";

export const FOIL_FINISH_LABEL = "Foil";

export const TCGPLAYER_PRODUCT_LINES: Record<string, string> = {
  mtg: "Magic",
  pokemon: "Pokemon",
  yugioh: "YuGiOh",
  lorcana: "Lorcana TCG",
  onepiece: "One Piece Card Game",
  fab: "Flesh and Blood TCG",
  swu: "Star Wars: Unlimited",
  gundam: "Gundam Card Game",
  grandarchive: "Grand Archive TCG",
};
