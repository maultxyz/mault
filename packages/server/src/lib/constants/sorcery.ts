import type { SorceryFinish } from "../interfaces/sorcery";

export const SORCERY_TCGPLAYER_CATEGORY_ID = 77;
export const SORCERY_BASE_PRODUCT = "Booster";
export const SORCERY_STANDARD_FINISH: SorceryFinish = "Standard";
export const SORCERY_FOIL_TYPE = "Foil";
export const SORCERY_FOIL_TYPE_BY_FINISH: Partial<Record<SorceryFinish, string>> = {
  Foil: SORCERY_FOIL_TYPE,
  Rainbow: "Rainbow Foil",
};
export const SORCERY_PRINTING_FINISH_SUFFIX_PATTERN = /-[a-z]+$/;
export const SORCERY_TCGPLAYER_FOIL_VARIANT = "Foil";
export const SORCERY_TCGPLAYER_VARIANT_SUFFIX_PATTERN = /\s*\(([^)]*)\)\s*$/;
export const SORCERY_PRODUCT_BY_TCGPLAYER_VARIANT: Record<string, string> = {
  "Preconstructed Deck": "PreconstructedDeck",
  "Box Topper": "BoxTopper",
  "Draft Kit": "DraftKit",
};
export const SORCERY_TCGPLAYER_SUBTYPES = {
  price: ["Normal"],
  priceFoil: ["Foil"],
};
export const SORCERY_TYPE_LINE_SEPARATOR = " - ";
