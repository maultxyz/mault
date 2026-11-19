import type { OrgRole } from "@magic-vault/shared";

export const STATS_SYNC_MANAGER_ROLES: OrgRole[] = ["owner", "admin"];
export const STATS_SYNC_DEFAULT_TARGET_URL = "https://mault.xyz/api";
export const STATS_SYNC_REQUEST_TIMEOUT_MS = 30_000;
export const STATS_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const STATS_SYNC_RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;
export const STATS_SYNC_SCHEDULE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
export const STATS_SYNC_SCHEDULE_STARTUP_DELAY_MS = 2 * 60 * 1000;
export const STATS_SYNC_RESEND_RECENT_DAYS = 7;
export const STATS_SYNC_USER_AGENT = "Mault-SelfHosted-StatsSync/1.0";
export const STATS_SYNC_PUSH_RATE_LIMIT_REQUESTS = 30;
export const STATS_SYNC_PUSH_RATE_LIMIT_WINDOW_MS = 60_000;
export const STATS_SYNC_PUSH_RATE_LIMIT_SWEEP_SIZE = 1000;
export const STATS_SYNC_LATEST_DAY_AHEAD_DAYS = 1;

export const STATS_SYNC_MANAGERS_ONLY_MESSAGE =
  "Only organization owners and admins can manage stats sync.";
export const STATS_SYNC_KEY_INVALID_MESSAGE = "Invalid or revoked stats sync key.";
export const STATS_SYNC_RATE_LIMITED_MESSAGE = "Too many stats sync requests. Retry later.";
export const STATS_SYNC_BODY_INVALID_MESSAGE = "Invalid stats sync payload.";
export const STATS_SYNC_CONNECT_FAILED_MESSAGE =
  "The main instance rejected this stats sync key.";
