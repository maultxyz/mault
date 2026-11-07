import type { IconName } from "@/lib/interfaces/ui";

export const TAB_ICONS: Record<string, IconName> = {
  index: "collections",
  scan: "scan",
  storage: "storage",
  account: "menu",
};

export const FULL_BLEED_ROUTE_PATTERN = /^\/(desktop-camera\/|storage-card-scan$|batch-scan$)/;
export const UNFRAMED_STACK_ROUTE_NAMES = new Set([
  "(tabs)",
  "card/[scanId]",
  "unmatched-card",
  "collection-new",
  "collection-rename",
  "storage-name",
  "storage-card-scan",
  "batch-scan",
  "desktop-camera/[guid]",
]);
