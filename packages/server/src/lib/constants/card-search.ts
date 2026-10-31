export const CARD_API_USER_AGENT =
  process.env.CARD_API_USER_AGENT || "Mault-SelfHosted/1.0";

export const CARD_API_HEADERS: Record<string, string> = {
  "User-Agent": CARD_API_USER_AGENT,
  Accept: "application/json",
};

export const MATCH_CONFIDENCE_TEMPERATURE = 0.05;

export const DUPLICATE_PRINTING_MAX_DISTANCE = 0.02;

export const SCRYFALL_LIST_SET_CODES = ["plst", "ulst"];

export const SCRYFALL_ETCHED_FINISH = "etched";

export const SCRYFALL_FOIL_PROMO_TYPES = [
  "surgefoil",
  "galaxyfoil",
  "silverfoil",
  "ripplefoil",
  "rainbowfoil",
  "doublerainbow",
  "halofoil",
  "textured",
  "stepandcompleat",
  "fracturefoil",
  "raisedfoil",
  "manafoil",
  "gilded",
  "confettifoil",
  "neonink",
  "oilslick",
  "invisibleink",
  "chocobotrackfoil",
  "facetfoil",
  "dazzlefoil",
  "dragonscalefoil",
  "cosmicfoil",
  "singularityfoil",
  "firstplacefoil",
];

export const SCRYFALL_FOIL_TYPE_ALIASES: Record<string, string> = {
  silverscreen: "silverfoil",
};

export const STORED_SEARCH_LIMIT = 60;

export const COLLECTOR_NUMBER_BACKFILL_BATCH_SIZE = 1000;

export const PRINTED_TOTAL_NUMBER_PATTERN = /^#?([a-z0-9-]+)\/\d+$/i;
export const SET_AND_NUMBER_PATTERN = /^([a-z0-9]+)[\s#/-]+#?([a-z0-9]+)$/i;
export const SINGLE_TOKEN_PATTERN = /^#?([a-z0-9-]+)$/i;
export const NAME_AND_NUMBER_PATTERN =
  /^(.*\S)\s+#?([a-z0-9-]*\d[a-z0-9-]*)(?:\/\d+)?$/i;

export const NETDECK_SEARCH_PAGE_SIZE = 30;
export const NETDECK_IMAGE_GAMES = new Set(["cyberpunk"]);
export const NETDECK_SLUG_PATTERN = /^[a-z0-9-]+$/;
export const NETDECK_IMAGE_URL_REFRESH_MARGIN_MS = 10 * 60 * 1000;
export const NETDECK_IMAGE_URL_FALLBACK_TTL_MS = 60 * 60 * 1000;
export const CYBERPUNK_TCGPLAYER_CATEGORY_ID = 92;

export const POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID = 85;
export const POKEMON_JAPAN_CARDMARKET_GAME_ID = 6;
export const POKEMON_JAPAN_LANGUAGES = ["ja"];
export const POKEMON_JAPAN_SEARCH_RECENT_SET_COUNT = 5;
export const POKEMON_JAPAN_SEARCH_RESULT_LIMIT = 30;
export const POKEMON_JAPAN_EXT_KEYS = {
  stage: ["stage", "Stage"],
  energyTypes: ["cardType", "Card Type"],
  hitPoints: ["hp", "HP"],
  retreatCost: ["retreatCost", "Retreat Cost"],
  description: ["description", "Description"],
  attacks: [
    ["attack1", "Attack 1"],
    ["attack2", "Attack 2"],
    ["attack3", "Attack 3"],
    ["attack4", "Attack 4"],
  ],
  artist: ["Artist", "artist"],
} as const;
export const POKEMON_JAPAN_RARITY_NONE = "None";

export const FAB_SEARCH_CARD_LIMIT = 12;
export const FAB_STANDARD_FOILING = "S";
export const FAB_TCGPLAYER_FOIL_NAMES: Record<string, string> = {
  S: "Normal",
  R: "Rainbow Foil",
  C: "Cold Foil",
  G: "Cold Foil",
};
export const FAB_TCGPLAYER_EDITION_PREFIXES: Record<string, string> = {
  A: "1st Edition ",
  F: "1st Edition ",
  U: "Unlimited Edition ",
};

export const GRAND_ARCHIVE_SEARCH_PAGE_SIZE = 30;
export const GRAND_ARCHIVE_RARITY_NAMES: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
  5: "Ultra Rare",
  6: "Promotional Rare",
  7: "Collector Super Rare",
  8: "Collector Ultra Rare",
  9: "Collector Promo Rare",
};
export const GRAND_ARCHIVE_PROMO_RARITIES = new Set([6, 9]);

export const MATCH_MAX_DISTANCE_RATIO = 0.9;

export const EXIF_ORIENTATION_TRANSPOSED_FROM = 5;

export const MILO_EMBEDDING_DIM = 128;

export const CARD_SETS_CACHE_TTL_MS = 15 * 60 * 1000;

export const CARD_MATCH_LIMIT = 5;

export const CARD_MATCH_RUNNER_UP_SEARCH_LIMIT = 20;

export const CARD_MATCH_HNSW_EF_SEARCH = 1000;
export const CARD_VECTOR_INDEX_M = 32;
export const CARD_VECTOR_INDEX_EF_CONSTRUCTION = 200;
