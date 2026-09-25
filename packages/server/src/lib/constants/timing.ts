export const CARD_API_TIMEOUT_MS = 10_000;
// A connected sorter's client renews its lease well inside this window, so
// expiry only happens when a tab dies without releasing it.
export const DEVICE_LEASE_TTL_MS = 60_000;
export const SCAN_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes of inactivity
export const STRIPE_PRICE_CACHE_TTL_MS = 60 * 60 * 1000;
export const HEALTH_CACHE_TTL_MS = 20_000;
export const DISCORD_LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const FLESHCUBE_RETRY_DELAY_MS = 250;
export const TCGCSV_REQUEST_DELAY_MS = 100;
