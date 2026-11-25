export const IMPERSONATION_ISSUER = "magic-vault-impersonation";
export const MONITOR_LINK_ISSUER = "magic-vault-monitor-link";
export const STORAGE_SHARE_LINK_ISSUER = "magic-vault-storage-share-link";
export const CARD_SHARE_LINK_ISSUER = "magic-vault-card-share-link";
export const SHOP_CATALOG_ISSUER = "magic-vault-shop-catalog";
export const IMPERSONATION_TTL_SECONDS = 60 * 60;
export const NEON_JWT_CLOCK_TOLERANCE_SECONDS = 30;
export const IMPERSONATION_SESSION_CACHE_TTL_MS = 10_000;
export const IMPERSONATION_SESSION_CACHE_MAX_ENTRIES = 500;
export const ACCOUNT_CHANGES_BLOCKED_WHILE_IMPERSONATING_MESSAGE =
  "Keys, links, members, billing and data deletion can't be changed while impersonating.";
export const MONITOR_LINK_GUEST_NAME = "Guest";
export const DISPLAY_NAME_CACHE_TTL_MS = 5 * 60 * 1000;
export const MAX_TIMER_DELAY_MS = 2_147_483_647;
export const MONITOR_LINK_INVALID_MESSAGE = "This link is invalid or has expired.";
export const LOCAL_AUDIT_EVENTS_LIMIT = 100;
export const SCANNING_BLOCKED_WHILE_IMPERSONATING_MESSAGE =
  "Scanning and sorter hardware are disabled while impersonating.";

export const MONITOR_LINK_GUEST_HIDDEN_KEYS: ReadonlySet<string> = new Set([
  "alternativeMatches",
  "lowConfidenceMatch",
  "isCorrected",
  "isReviewed",
  "autoReviewed",
  "wasCorrected",
  "diagnostics",
  "storageLocation",
]);

export const MONITOR_LINK_GUEST_SESSION_EVENTS: ReadonlySet<string> = new Set([
  "card_added",
  "card_updated",
  "card_removed",
  "cards_removed",
  "cards_cleared",
  "cards_tags_changed",
  "cards_condition_changed",
  "cards_foil_changed",
]);
