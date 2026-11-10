export const QR_CODE_IMAGE_OPTIONS = { margin: 1, width: 220 } as const;
export const CARD_HOLD_GUEST_KEY_STORAGE_KEY = "mault:card-hold-guest-key";
export const CARD_HOLD_GUEST_NAME_STORAGE_KEY = "mault:card-hold-guest-name";
export const CARD_HOLD_GUEST_KEY_BYTES = 24;
export const CARD_HOLDS_QUERY_KEY = "card-holds";
export const PUBLIC_CARD_HOLDS_QUERY_KEY = "public-card-holds";
export const CARD_HOLDS_REFETCH_INTERVAL_MS = 30_000;
export const CARD_HOLD_SHARE_LINK_PATHS = {
  collection: "/api/public/monitor-link",
  storage: "/api/public/storage-share-link",
} as const;
