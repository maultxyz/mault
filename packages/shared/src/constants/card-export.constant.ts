import type { CardCondition } from "../interfaces/card-condition.interface";

export const CONDITION_EXPORT_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const MANABOX_LANGUAGE_CODES: Record<string, string> = {
  zhs: "zh_CN",
  zht: "zh_TW",
};

export const MOXFIELD_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  zhs: "Chinese Simplified",
  zht: "Chinese Traditional",
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
