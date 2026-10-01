import type { ScannerStatus } from "@magic-vault/shared";

export const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
];

export const SESSION_TIMER_RUNNING_STATUSES: ScannerStatus[] = [
  "scanning",
  "settling",
  "searching",
  "captured",
  "duplicate",
  "no-match",
];

export const PAUSE_WHEN_HIDDEN_STATUSES: ScannerStatus[] = [
  "scanning",
  "settling",
  "searching",
  "captured",
  "duplicate",
  "no-match",
];

export const MTG_ASPECT_RATIO = 2.5 / 3.5;
export const PHONE_CAMERA_JPEG_QUALITY = 0.85;
export const CATCH_ALL_BIN = 7;

export const STALE_DEVICE_THRESHOLD_DAYS = 30;

export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

export const JAM_TOAST_ID_PREFIX = "jam-module-";
export const JAM_COMMAND_TIMEOUT_MS = 3000;
export const JAM_CLEAR_DEVICE_TIMEOUT_MS = 10000;
export const JAM_VERIFY_SAMPLES = 3;
export const JAM_VERIFY_INTERVAL_MS = 750;
export const SCAN_POSITION_MODULE = 1;
export const SENSOR_BLOCKED_TOAST_ID = "test-sensor-blocked";
export const SESSION_LOCK_ALERT_ID = "session-lock";
export const ROUTE_TIMEOUT_MODULE_PATTERN = /no card detected at module (\d+)/;

export const PARKED_PANELS_ROOT_CLASS =
  "fixed top-0 left-0 -z-10 invisible pointer-events-none";

export const OCR_CROP_WIDTH = 630;
export const OCR_CROP_HEIGHT = 880;

export const UNMATCHED_RATE_WINDOW = 20;
export const UNMATCHED_RATE_MIN_SCANS = 10;
export const UNMATCHED_RATE_THRESHOLD = 0.3;
export const UNMATCHED_RATE_TOAST_COOLDOWN_MS = 30 * 60 * 1000;
export const UNMATCHED_RATE_TOAST_ID = "unmatched-rate";

export const SHOW_SCAN_LOGS = import.meta.env.VITE_SHOW_SCAN_LOGS === "true";

export const ONNX_RUNTIME_FAILURE_TOAST_ID = "onnx-runtime-failure";

export const COLOR_BAR_MIN_SATURATION = 0.35;
export const COLOR_BAR_MIN_BRIGHTNESS = 64;
export const COLOR_BAR_MIN_SHARE = 0.12;
export const COLOR_BAR_HUE_RANGES: Record<string, [number, number][]> = {
  Red: [
    [0, 20],
    [330, 360],
  ],
  Yellow: [[35, 70]],
  Blue: [[180, 260]],
};

export const SCAN_IMAGE_URL_STALE_MS = 50 * 60 * 1000;

export const AUTO_CONNECT_PLUG_DELAY_MS = 1000;
export const AUTO_CONNECT_SETTLE_MS = 750;
