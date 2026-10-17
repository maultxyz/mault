import type { FirmwareFeature } from "../interfaces/firmware.interface";

export function isFirmwareVersionOutdated(
  version: string | null | undefined,
  latestVersion: string,
): boolean {
  if (!version) return false;
  const current = version.split(".").map((n) => parseInt(n, 10) || 0);
  const latest = latestVersion.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const c = current[i] ?? 0;
    const l = latest[i] ?? 0;
    if (c < l) return true;
    if (c > l) return false;
  }
  return false;
}

export const FIRMWARE_FEATURE_MIN_VERSIONS: Record<FirmwareFeature, string> = {
  pipelinedFeed: "2.1.0",
  feederRollback: "2.4.0",
  storedCalibration: "2.5.0",
  paddleOpenDelay: "2.6.0",
  wifiRemote: "2.10.0",
};

export function isFirmwareFeatureSupported(
  version: string | null | undefined,
  feature: FirmwareFeature,
): boolean {
  return (
    !!version &&
    !isFirmwareVersionOutdated(version, FIRMWARE_FEATURE_MIN_VERSIONS[feature])
  );
}

export const SERIAL_FED_EVENT = "fed";
export const SERIAL_JAM_ERROR = "jam";
export const SERIAL_BUSY_ERROR = "busy";
export const SERIAL_PUSH_BLOCKED_ERROR = "push_blocked";
export const SERIAL_SEQ_MAX = 2_000_000_000;
export const SERIAL_IDENTIFY_ATTEMPTS = 5;
export const SERIAL_READY_STATUS = "ready";
export const SERIAL_SERVO_DRIVER_MISSING = "missing";
export const SERIAL_HEARTBEAT_MAX_MISSES = 2;
export const SERIAL_RESET_REASONS = [
  "power_on",
  "external",
  "software",
  "watchdog",
  "brownout",
  "panic",
  "usb",
  "other",
  "unknown",
] as const;
export const SERIAL_ABNORMAL_RESET_REASONS = ["watchdog", "brownout", "panic"];
export const SERIAL_BOOT_MATCH_TOLERANCE_MS = 10_000;

export const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export const BLE_WRITE_CHUNK_SIZE = 20;
export const BLE_ATT_HEADER_SIZE = 3;
export const BLE_MAX_WRITE_CHUNK_SIZE = 509;

export const BLE_CONNECT_ATTEMPTS = 4;
export const BLE_CONNECT_RETRY_DELAY_MS = 600;

export const BLE_RECONNECT_BASE_DELAY_MS = 2000;
export const BLE_RECONNECT_MAX_DELAY_MS = 30000;
