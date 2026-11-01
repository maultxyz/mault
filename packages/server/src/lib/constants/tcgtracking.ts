export const TCGTRACKING_FALLBACK_ID_PREFIX = "tcgp-";
export const TCGTRACKING_FALLBACK_SOURCE = "tcgtracking";
export const TCGTRACKING_REQUEST_DELAY_MS = 150;
export const TCGTRACKING_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
export const TCGTRACKING_IMAGE_WIDTH_NORMAL = "1000w";
export const TCGTRACKING_IMAGE_WIDTH_SMALL = "400w";
export const TCGTRACKING_SET_ALIGNMENT_MIN_SHARED = 3;
export const TCGTRACKING_SET_ALIGNMENT_MIN_FRACTION = 0.3;
export const TCGTRACKING_NEW_SET_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
export const TCGTRACKING_TYPE_LINE_SEPARATOR = " \u2014 ";
export const TCGTRACKING_MTG_COLOR_LETTERS: Record<string, string> = {
  White: "W",
  Blue: "U",
  Black: "B",
  Red: "R",
  Green: "G",
};
export const TCGTRACKING_EXT_KEYS = {
  fullType: ["fullType"],
  type: ["cardType", "CardType", "Card Type"],
  subtypes: ["subtypes", "Subtypes", "Card SubType", "cardSubtype"],
  text: ["description", "Description"],
  power: ["power", "Power", "attackPoints", "attack", "Might"],
  toughness: ["toughness", "hitPoints", "hp", "defense"],
  cost: ["convertedCost", "cost", "Cost", "Energy Cost"],
  color: ["color", "Color", "aspect", "Domain", "element"],
} as const;

export const TCGTRACKING_PRODUCT_NUMBER_SUFFIX_PATTERN =
  /\s+-\s+[A-Za-z]*\d+[A-Za-z]?(?:\/\d+)?(?=\s*(?:\(|$))/;

export const GUNDAM_PRODUCT_CARD_NUMBER_TAG_PATTERN = /\s*\([A-Z]+\d*-\d+\)/g;

export const POKEMON_BASIC_ENERGY_PREFIX_PATTERN = /^Basic\s+(?=.*\bEnergy\b)/i;

export const TCGTRACKING_SKU_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const TCGTRACKING_SKU_CACHE_MAX_KEYS = 200_000;
export const TCGTRACKING_PRODUCT_SET_CACHE_MAX_KEYS = 50_000;
export const TCGTRACKING_SKU_SET_FETCH_CONCURRENCY = 3;
export const TCGTRACKING_PRODUCT_SET_LOOKUPS_PER_EXPORT_MAX = 200;
export const TCGTRACKING_SKU_LANGUAGE_CODES: Record<string, string> = {
  ja: "JP",
  zhs: "CS",
  zht: "CT",
};
