import type { IconName } from "@/lib/interfaces/ui";

export const TAB_ICONS: Record<string, IconName> = {
  index: "collections",
  scan: "scan",
  storage: "storage",
  account: "menu",
};

export const MODAL_ROUTE_PATTERN = /^\/(card\/|unmatched-card$|collection-new$|collection-edit$|storage-name$|share-link$)/;
export const UNFRAMED_STACK_ROUTE_NAMES = new Set([
  "(tabs)",
  "card/[scanId]",
  "unmatched-card",
  "collection-new",
  "collection-edit",
  "storage-name",
  "share-link",
  "storage-card-scan",
  "batch-scan",
  "desktop-camera/[guid]",
]);

export const ANDROID_TAB_SYMBOLS = {
  index: "collections_bookmark",
  scan: "document_scanner",
  storage: "inventory_2",
  account: "menu",
} as const;
