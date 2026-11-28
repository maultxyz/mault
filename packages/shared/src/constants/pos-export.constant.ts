export const POS_EXPORT_FORMATS = ["shopify", "square", "sku"] as const;

export const POS_EXPORT_FILENAMES = {
  shopify: "shopify-products.csv",
  square: "square-items.csv",
  sku: "sku-inventory.csv",
} as const;

export const CARD_SKU_GAME_PREFIXES: Record<string, string> = {
  mtg: "MTG",
  gundam: "GUN",
  pokemon: "PKM",
  pokemonjp: "PKJ",
  digimon: "DGM",
  elestrals: "ELS",
  unionarena: "UA",
  lorcana: "LOR",
  onepiece: "OP",
  fab: "FAB",
  yugioh: "YGO",
  riftbound: "RB",
  swu: "SWU",
  grandarchive: "GA",
  cyberpunk: "CP",
  sorcery: "SOR",
};

export const CARD_SKU_FALLBACK_GAME_PREFIX_LENGTH = 3;
export const CARD_SKU_SEPARATOR = "-";
export const CARD_SKU_NONFOIL_CODE = "N";
export const CARD_SKU_FOIL_CODE = "F";
export const CARD_SKU_FOIL_TYPE_CODE_MAX_LENGTH = 3;
export const CARD_SKU_CHECK_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CARD_SKU_CHECK_LENGTH = 4;
export const CARD_SKU_CHECK_BITS_PER_CHARACTER = 5;

export const SHOPIFY_PRODUCT_TYPE = "Trading Card";
export const SHOPIFY_DEFAULT_OPTION_NAME = "Title";
export const SHOPIFY_DEFAULT_OPTION_VALUE = "Default Title";
export const SQUARE_DEFAULT_VARIATION_NAME = "Regular";
