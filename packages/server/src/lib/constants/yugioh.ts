export const YUGIOH_PRINTING_ID_SEPARATOR = "_";

export const YUGIOH_RARITY_KEY_ALIASES: Record<string, string> = {
  "common-short-print": "common",
  "short-print": "common",
  "duel-terminal-technology-common": "duel-terminal-normal-parallel-rare",
  "duel-terminal-technology-ultra-rare": "duel-terminal-ultra-parallel-rare",
  "ultra-pharaoh-s-rare": "ultra-rare-pharaoh-s-rare",
};

export const YUGIOH_DATE_REPRINT_SET_NAME_PATTERN = /reprint\)\s*$/i;

export const YUGIOH_MISSING_PRODUCT_NUMBER = "N/A";

export const YUGIOH_PRINTING_ONLY_KEYS = [
  "card_sets",
  "card_images",
  "card_prices",
  "tcgtrackingProductId",
  "tcgtrackingFinishProducts",
] as const;
