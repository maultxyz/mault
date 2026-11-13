import type { OrgRole } from "@magic-vault/shared";
import type { BusinessResult } from "../interfaces/business";

export const BUSINESS_UPGRADE_MESSAGE =
  "Buy and sell is not part of your plan. Upgrade your plan to use it.";
export const BUSINESS_FORBIDDEN_MESSAGE =
  "Your organization role doesn't allow this.";
export const BUSINESS_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const DEVICE_LAST_SEEN_THROTTLE_MS = 60_000;
export const INVENTORY_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
export const INVENTORY_SNAPSHOT_STARTUP_DELAY_MS = 2 * 60 * 1000;
export const ALERT_EMBED_COLOR = 0xed4245;
export const MAINTENANCE_EMBED_COLOR = 0xfee75c;
export const COST_UPDATE_CHUNK_SIZE = 2000;

export const SPOT_CHECK_NOT_FOUND_MESSAGE = "Spot check not found.";
export const SORTER_NOT_FOUND_MESSAGE = "Sorter not found.";
export const INTAKE_LOT_NOT_FOUND_MESSAGE = "Intake lot not found.";
export const PICK_NOT_FOUND_MESSAGE = "Pick not found.";
export const SHOP_CATALOG_NOT_FOUND_MESSAGE = "Shop catalog not found.";
export const SHOP_CATALOG_CARD_NOT_FOUND_MESSAGE = "This card is no longer in the catalog.";
export const SHOP_PHOTO_MISSING_MESSAGE = "Choose a photo to upload.";
export const SHOP_PHOTO_TYPE_MESSAGE = "Upload a JPEG, PNG or WebP photo.";
export const SHOP_PHOTO_TOO_LARGE_MESSAGE = "That photo is too large. Upload one under 10 MB.";
export const SHOP_PHOTO_UNREADABLE_MESSAGE = "That file isn't a photo we can read.";
export const SHOP_CATALOG_INVALID_MESSAGE = "Invalid shop catalog.";
export const SHOP_CATALOG_SOURCES_INVALID_MESSAGE =
  "A collection or storage location in this catalog no longer exists.";

export const BUSINESS_UPGRADE_REQUIRED_RESULT: BusinessResult = {
  success: false,
  message: BUSINESS_UPGRADE_MESSAGE,
  upgradeRequired: true,
};

export const BUSINESS_FORBIDDEN_RESULT: BusinessResult = {
  success: false,
  message: BUSINESS_FORBIDDEN_MESSAGE,
};
