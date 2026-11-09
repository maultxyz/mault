import type { OrgRole } from "@magic-vault/shared";
import { orgApiKeys } from "../../db/schema";

export const API_ACCESS_UPGRADE_MESSAGE =
  "API access is not part of your plan. Upgrade your plan to create API keys.";
export const API_KEY_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const API_KEY_RANDOM_BYTES = 32;
export const API_KEY_VISIBLE_PREFIX_LENGTH = 8;
export const API_KEY_LAST_USED_THROTTLE_MS = 60_000;
export const PUBLIC_API_CHANGE_OVERLAP_SECONDS = 60;
export const PUBLIC_API_PATH_PREFIX = "/v1/";
export const PUBLIC_API_EXPOSED_HEADERS = [
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
  "Retry-After",
];
export const PUBLIC_API_RATE_LIMIT_REQUESTS = 60;
export const PUBLIC_API_RATE_LIMIT_WINDOW_MS = 60_000;
export const PUBLIC_API_RATE_LIMIT_SWEEP_SIZE = 1000;
export const SHARE_LINK_RATE_LIMIT_REQUESTS = 120;
export const SHARE_LINK_RATE_LIMIT_WINDOW_MS = 60_000;
export const SHARE_LINK_CLAIMS_CACHE_TTL_MS = 30_000;
export const SHARED_STORAGE_READS_CACHE_TTL_MS = 60_000;
export const SHARE_LINK_CACHE_MAX_ENTRIES = 2000;
export const SHARE_LINK_RATE_LIMITED_MESSAGE = "Too many requests for this link. Slow down and retry.";
export const PUBLIC_API_CARD_NOT_FOUND = "No card found with that id.";
export const PUBLIC_API_LOCATION_NOT_FOUND = "No location found with that id.";
export const PUBLIC_API_READ_ONLY_KEY =
  "This API key is read-only. Create a key with write access to change cards.";
export const PUBLIC_API_TIMESTAMP_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';

export const ORG_API_KEY_COLUMNS = {
  guid: orgApiKeys.guid,
  name: orgApiKeys.name,
  keyPrefix: orgApiKeys.keyPrefix,
  scope: orgApiKeys.scope,
  createdBy: orgApiKeys.createdBy,
  createdAt: orgApiKeys.createdAt,
  lastUsedAt: orgApiKeys.lastUsedAt,
};
export const API_USAGE_FLUSH_INTERVAL_MS = 60_000;
export const API_USAGE_RETENTION_DAYS = 90;
export const API_USAGE_REPORT_ROW_LIMIT = 200;
export const API_USAGE_ID_SEGMENT_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+(?:\.\d+)*|[A-Za-z0-9_-]{24,})$/i;
export const MONITOR_LINK_STREAM_USAGE_ENDPOINT = "GET /stream?share";
