export const IMPERSONATION_ISSUER = "magic-vault-impersonation";
export const MONITOR_LINK_ISSUER = "magic-vault-monitor-link";
export const STORAGE_SHARE_LINK_ISSUER = "magic-vault-storage-share-link";
export const IMPERSONATION_TTL_SECONDS = 60 * 60;
export const MONITOR_LINK_GUEST_NAME = "Guest";
export const DISPLAY_NAME_CACHE_TTL_MS = 5 * 60 * 1000;
export const MAX_TIMER_DELAY_MS = 2_147_483_647;
export const MONITOR_LINK_INVALID_MESSAGE = "This link is invalid or has expired.";
export const LOCAL_AUDIT_EVENTS_LIMIT = 100;
export const SCANNING_BLOCKED_WHILE_IMPERSONATING_MESSAGE =
  "Scanning and sorter hardware are disabled while impersonating.";
export const CARD_HOLDS_DISABLED_MESSAGE = "Holds are not allowed on this link.";
export const CARD_HOLD_NOT_FOUND_MESSAGE = "Card not found.";
export const CARD_HOLD_CONFLICT_MESSAGE = "Someone already has this card on hold.";
export const CARD_HOLD_GUEST_LIMIT_MESSAGE = "You have reached the hold limit on this link.";
export const CARD_HOLD_GUEST_KEY_MESSAGE = "Missing or invalid hold key.";
export const CARD_HOLD_RELEASE_NOT_FOUND_MESSAGE = "Hold not found.";
