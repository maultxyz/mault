export const SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS = 5000;
export const SERIAL_IDENTIFY_TIMEOUT_MS = 5000;
export const SERIAL_IDENTIFY_ATTEMPT_TIMEOUT_MS = 2000;
export const SERIAL_HEARTBEAT_INTERVAL_MS = 10_000;
export const SERIAL_HEARTBEAT_TIMEOUT_MS = 3000;
export const SELF_TEST_RESPONSE_TIMEOUT_MS = 20_000;
export const NEUTRAL_RESPONSE_TIMEOUT_MS = 5000;
export const ROUTE_RESPONSE_TIMEOUT_MS = 15_000;
export const ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS = 25_000;
export const FEEDER_RESPONSE_TIMEOUT_MS = 10_000;
export const STORE_CONFIG_TIMEOUT_MS = 5000;
export const DEVICE_LEASE_HEARTBEAT_MS = 20_000;
export const BLE_DISCOVERY_TIMEOUT_MS = 15_000;
export const BLE_PREFERRED_MTU = 517;
export const BLE_STATE_SETTLE_TIMEOUT_MS = 3000;
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
export const JAM_COMMAND_TIMEOUT_MS = 3000;
export const JAM_CLEAR_DEVICE_TIMEOUT_MS = 10_000;
export const AUTO_RECONNECT_INTERVAL_MS = 5000;
export const AUTO_RECONNECT_ATTEMPTS = 12;
export const AUTO_CONNECT_LAUNCH_DELAY_MS = 1000;
