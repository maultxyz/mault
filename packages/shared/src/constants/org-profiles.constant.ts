import { RESERVED_SHORT_LINK_CODES } from "./monitor-links.constant";

export const ORG_PROFILE_PATH_PREFIX = "/@";
export const ORG_PROFILE_HANDLE_PARAM = "handle";
export const ORG_PROFILE_HANDLE_MIN_LENGTH = 3;
export const ORG_PROFILE_HANDLE_MAX_LENGTH = 30;
export const ORG_PROFILE_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
export const ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH = 60;
export const ORG_PROFILE_BIO_MAX_LENGTH = 300;
export const ORG_PROFILE_LINK_LABEL_MAX_LENGTH = 40;
export const ORG_PROFILE_LINK_URL_MAX_LENGTH = 2048;
export const ORG_PROFILE_LINKS_MAX = 20;
export const ORG_PROFILE_SHOWCASE_CARDS_MAX = 24;
export const ORG_PROFILE_SHOP_CATALOGS_MAX = 10;
export const DEFAULT_ORG_PROFILE_SHOWS_PRICES = false;
export const ORG_PROFILE_SAVE_ERROR_CODES = ["handleTaken", "forbidden", "sourcesInvalid", "invalid"] as const;

export const ORG_PROFILE_LINK_KINDS = [
  "website",
  "tcgplayer",
  "cardmarket",
  "ebay",
  "whatnot",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "bluesky",
  "facebook",
  "twitch",
  "discord",
  "other",
] as const;

export const RESERVED_ORG_PROFILE_HANDLES = [
  ...RESERVED_SHORT_LINK_CODES,
  "admin",
  "api",
  "app",
  "auth",
  "help",
  "mault",
  "official",
  "root",
  "settings",
  "shop",
  "staff",
  "support",
  "team",
] as const;
