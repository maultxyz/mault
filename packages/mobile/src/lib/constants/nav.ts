import type { IconName } from "@/lib/interfaces/ui";

export const TAB_ICONS: Record<string, IconName> = {
  index: "home",
  scan: "scan",
  collections: "collections",
  "buy-and-sell": "store",
  account: "menu",
};

export const SCAN_TAB_PATHNAME = "/scan";

export const SHEET_ROUTE_PATTERN = /^\/(card\/|trade-offer\/|sent-trade-offer\/|unmatched-card$|collection-new$|collection-edit$|storage-name$|preset-description$|share-link$|settings\/invite-member$|settings\/webhook-edit$|settings\/api-key-new$|settings\/shop-catalog-edit$|settings\/shop-catalog-link$|settings\/sound-clip-name$|settings\/sound-rule$|settings\/notification-rule$|settings\/change-email$|settings\/change-password$|business\/intake-new$|business\/intake-accept$|business\/intake-transfer$|business\/pick-new$|business\/substitute$)/;
export const UNFRAMED_STACK_ROUTE_NAMES = new Set([
  "(tabs)",
  "card/[scanId]",
  "unmatched-card",
  "collection-new",
  "collection-edit",
  "storage-name",
  "preset-description",
  "settings/invite-member",
  "settings/webhook-edit",
  "settings/api-key-new",
  "settings/shop-catalog-edit",
  "settings/shop-catalog-link",
  "settings/sound-clip-name",
  "settings/sound-rule",
  "settings/notification-rule",
  "settings/change-email",
  "settings/change-password",
  "business/intake-new",
  "business/intake-accept",
  "business/intake-transfer",
  "business/pick-new",
  "business/substitute",
  "share-link",
  "trade-offer/[guid]",
  "sent-trade-offer/[guid]",
  "storage-card-scan",
  "trade/scan",
  "batch-scan",
  "desktop-camera/[guid]",
]);

export const ANDROID_TAB_SYMBOLS = {
  index: "home",
  scan: "document_scanner",
  collections: "collections_bookmark",
  "buy-and-sell": "storefront",
  account: "menu",
} as const;
