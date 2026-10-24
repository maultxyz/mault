import type { OrgRole } from "@magic-vault/shared";

export const BUSINESS_UPGRADE_MESSAGE =
  "Business tools are part of the Business plan. Upgrade to Business to use them.";
export const BUSINESS_FORBIDDEN_MESSAGE =
  "Your organization role doesn't allow this.";
export const BUSINESS_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const DEVICE_LAST_SEEN_THROTTLE_MS = 60_000;
export const INVENTORY_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
export const INVENTORY_SNAPSHOT_STARTUP_DELAY_MS = 2 * 60 * 1000;
export const ALERT_EMBED_COLOR = 0xed4245;
export const MAINTENANCE_EMBED_COLOR = 0xfee75c;
export const COST_UPDATE_CHUNK_SIZE = 2000;
