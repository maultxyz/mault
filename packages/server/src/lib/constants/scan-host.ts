import type { PiScanPendingSave } from "@magic-vault/shared";

export const SCAN_HOST_PATH = "/scan-host";
export const SCAN_HOST_COLLECTIONS_PATH = "/collections";
export const SCAN_HOST_BINS_PATH = "/bins";

export const PI_LINK_DEVICE_API_SEGMENT = "/api";
export const PI_LINK_SCAN_ACTOR_HEADER = "X-Pi-Scan-Actor";
export const PI_LINK_REQUEST_TIMEOUT_MS = 30_000;

const GUID_SEGMENT = "[0-9a-fA-F-]{36}";

export const PI_LINK_ALLOWED_ROUTES: { method: string; pattern: RegExp }[] = [
  { method: "POST", pattern: new RegExp(`^/collections/${GUID_SEGMENT}/cards$`) },
  { method: "POST", pattern: new RegExp(`^/collections/${GUID_SEGMENT}/cards/sorted$`) },
  { method: "POST", pattern: new RegExp(`^/collections/${GUID_SEGMENT}/unmatched$`) },
  { method: "GET", pattern: new RegExp(`^/collections/${GUID_SEGMENT}/cards/copies$`) },
  { method: "POST", pattern: new RegExp(`^/collections/${GUID_SEGMENT}/cards/remove-bulk$`) },
  { method: "PUT", pattern: /^\/bins\/bins\/\d+$/ },
  { method: "POST", pattern: new RegExp(`^/bins/bins/${GUID_SEGMENT}/pick-list/found$`) },
  { method: "POST", pattern: /^\/scan-host\/[a-z-]+$/ },
];

export const PI_SCAN_PENDING_SAVE_STATUSES: PiScanPendingSave["status"][] = ["saving", "saved", "failed"];
export const PI_SCAN_PENDING_SAVE_TEXT_MAX_LENGTH = 300;
