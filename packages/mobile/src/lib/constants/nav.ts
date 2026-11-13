import type { IconName } from "@/lib/interfaces/ui";

export const TAB_ICONS: Record<string, IconName> = {
  index: "home",
  scan: "scan",
  collections: "collections",
  account: "menu",
};

export const SHEET_ROUTE_PATTERN = /^\/(card\/|trade-offer\/|unmatched-card$|collection-new$|collection-edit$|storage-name$|preset-description$|share-link$|settings\/invite-member$|settings\/webhook-edit$|settings\/api-key-new$|settings\/shop-catalog-edit$|settings\/shop-catalog-link$|settings\/sound-clip-name$)/;
export const UNFRAMED_STACK_ROUTE_NAMES = new Set([
  "(tabs)",
  "card/[scanId]",
  "unmatched-card",
  "collection-new",
  "collection-edit",
  "storage-name",
  "settings/invite-member",
  "settings/webhook-edit",
  "settings/api-key-new",
  "settings/shop-catalog-edit",
  "settings/shop-catalog-link",
  "settings/sound-clip-name",
  "share-link",
  "trade-offer/[guid]",
  "storage-card-scan",
  "trade/scan",
  "batch-scan",
  "desktop-camera/[guid]",
]);

export const ANDROID_TAB_SYMBOLS = {
  index: "home",
  scan: "document_scanner",
  collections: "collections_bookmark",
  account: "menu",
} as const;
