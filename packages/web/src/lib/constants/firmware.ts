export const LATEST_FIRMWARE_VERSION =
  import.meta.env.VITE_LATEST_FIRMWARE_VERSION ?? "1.0.1";

export const ESP32_FIRMWARE_CHIP = "ESP32-S3";
export const ESP32_FLASH_BAUD_RATE = 115200;
export const ESP32_HARD_RESET_SEQUENCE = "D0|R1|W100|R0";

export const SERIAL_FED_EVENT = "fed";
export const SERIAL_JAM_ERROR = "jam";
export const SERIAL_BUSY_ERROR = "busy";
export const SERIAL_PUSH_BLOCKED_ERROR = "push_blocked";
export const SERIAL_SEQ_MAX = 2_000_000_000;
export const SERIAL_IDENTIFY_ATTEMPTS = 5;
export const SERIAL_READY_STATUS = "ready";
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
