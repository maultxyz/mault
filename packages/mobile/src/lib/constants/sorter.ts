import type { SorterLinkOpenFailure } from "@magic-vault/shared";
import type { SorterErrorCode } from "@/lib/interfaces/sorter";

export const FEEDER_RESPONSE_TIMEOUT_MS = 10_000;
export const BLE_DISCOVERY_TIMEOUT_MS = 15_000;
export const BLE_PREFERRED_MTU = 517;
export const BLE_STATE_SETTLE_TIMEOUT_MS = 3000;
export const CLOUD_SORTER_ID_PREFIX = "cloud:";
export const MAX_COMM_LOG_ENTRIES = 200;
export const ROUTE_TIMEOUT_MODULE_PATTERN = /module (\d+)/i;
export const COMM_LOG_VISIBLE_ENTRIES = 40;
export const PHASE_TONES = {
  idle: "neutral",
  scanning: "info",
  connecting: "info",
  identifying: "info",
  syncing: "info",
  testing: "info",
  ready: "success",
  error: "destructive",
} as const;
export const BUSY_PHASES = ["connecting", "identifying", "syncing", "testing"] as const;
export const ANDROID_SPLIT_BLE_PERMISSIONS_API = 31;
export const AUTO_RECONNECT_INTERVAL_MS = 5000;
export const AUTO_RECONNECT_ATTEMPTS = 12;
export const AUTO_CONNECT_LAUNCH_DELAY_MS = 1000;

export const SORTER_ERROR_BY_OPEN_FAILURE: Record<SorterLinkOpenFailure, SorterErrorCode> = {
  offline: "sorter-offline",
  inUse: "sorter-in-use",
  failed: "connect-failed",
};
