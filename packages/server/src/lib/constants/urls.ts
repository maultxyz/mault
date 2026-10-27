import { BROWSER_SYNC_IMAGE_PROXY_HOSTS, SORTER_LINK_DEVICE_PATH } from "@magic-vault/shared";

export function getWebUrl(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}

export function getApiUrl(): string | null {
  return process.env.API_URL || null;
}

export function getSorterLinkUrl(): string | null {
  if (process.env.SORTER_LINK_URL) return process.env.SORTER_LINK_URL;
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;
  return `${apiUrl.replace(/^http/, "ws").replace(/\/$/, "")}${SORTER_LINK_DEVICE_PATH}`;
}

export const BMC_URL = "https://buymeacoffee.com/mault";

export const FAB_DEFAULT_URL = "https://api.fleshcube.com/card";
export const GRAND_ARCHIVE_API_ROOT = "https://api.gatcg.com";
export const GRAND_ARCHIVE_DEFAULT_URL = `${GRAND_ARCHIVE_API_ROOT}/cards`;
export const GRAND_ARCHIVE_INDEX_URL = "https://index.gatcg.com";
export const GUNDAM_DEFAULT_URL = "https://api.gcgapi.com/v1/cards";
export const NETDECK_API_ROOT = "https://api.netdeck.gg/api";
export const CYBERPUNK_DEFAULT_URL = `${NETDECK_API_ROOT}/cards/cyberpunk`;
export const LORCANA_DEFAULT_URL = "https://api.lorcast.com/v0/cards";
export const LORCANA_DE_API_ROOT = "https://lorcana-de-api.onrender.com/api";
export const LORCANA_DE_DEFAULT_URL = `${LORCANA_DE_API_ROOT}/cards`;
export const ONE_PIECE_DEFAULT_URL = "https://optcgapi.com/api";
export const POKEMON_DEFAULT_URL = "https://api.tcgdex.net/v2/en/cards";
export const RIFTBOUND_DEFAULT_URL = "https://api.riftcodex.com/cards";
export const SCRYFALL_DEFAULT_URL = "https://api.scryfall.com/cards";
export const SWU_API_ROOT = "https://api.swu-db.com";
export const SWU_DEFAULT_URL = `${SWU_API_ROOT}/cards`;

export const TCGCSV_URL = "https://tcgcsv.com";
export const CARDMARKET_CATALOG_URL =
  "https://downloads.s3.cardmarket.com/productCatalog";
export const CARDKINGDOM_PRICELIST_URL =
  "https://api.cardkingdom.com/api/v2/pricelist";
export const CARDKINGDOM_SITE_URL = "https://www.cardkingdom.com/";
export const YUGIOH_DEFAULT_URL =
  "https://db.ygoprodeck.com/api/v7/cardinfo.php";

export const ALLOWED_IMAGE_HOSTS = new Set([
  ...BROWSER_SYNC_IMAGE_PROXY_HOSTS,
  "cards.scryfall.io",
  "gundam-gcg.com",
  "www.gundam-gcg.com",
  "assets.tcgdex.net",
  "cdn.swu-db.com",
]);
