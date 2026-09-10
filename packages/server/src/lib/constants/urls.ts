// The public web app's own URL - used to build links back into it (email
// verification, Discord embeds, Stripe redirect URLs, invite links).
// Combined here so the same fallback isn't retyped at every call site.
export function getWebUrl(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}

export const BMC_URL = "https://buymeacoffee.com/mault";

// Default upstream API base URL for each supported TCG's card-search
// adapter (see lib/adapters/<game>/search.ts and sync.ts).
export const FAB_DEFAULT_URL = "https://api.goagain.dev/v1/cards";
export const GUNDAM_DEFAULT_URL = "https://api.gcgapi.com/v1/cards";
export const LORCANA_DEFAULT_URL = "https://api.lorcast.com/v0/cards";
export const LORCANA_DE_API_ROOT = "https://lorcana-de-api.onrender.com/api";
export const LORCANA_DE_DEFAULT_URL = `${LORCANA_DE_API_ROOT}/cards`;
export const ONE_PIECE_DEFAULT_URL = "https://optcgapi.com/api";
export const POKEMON_DEFAULT_URL = "https://api.eu1.tcgdex.net/v2/en/cards";
export const RIFTBOUND_DEFAULT_URL = "https://api.riftcodex.com/cards";
export const SCRYFALL_DEFAULT_URL = "https://api.scryfall.com/cards";
export const YUGIOH_DEFAULT_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

// Hosts the card-image proxy (routes/card/image-proxy.ts) is willing to
// fetch from - an allowlist, not just a default, since that route accepts
// an arbitrary url query param.
export const ALLOWED_IMAGE_HOSTS = new Set([
  "cards.scryfall.io",
  "gundam-gcg.com",
  "www.gundam-gcg.com",
  "assets.tcgdex.net",
]);
