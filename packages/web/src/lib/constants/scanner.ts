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
export const CLOSE_MATCH_DELTA = 0.05;
export const PHONE_CAMERA_JPEG_QUALITY = 0.85;
export const CATCH_ALL_BIN = 7;

export const STALE_DEVICE_THRESHOLD_DAYS = 30;

export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

export const JAM_TOAST_ID_PREFIX = "jam-module-";
export const JAM_COMMAND_TIMEOUT_MS = 3000;
export const JAM_CLEAR_DEVICE_TIMEOUT_MS = 10000;
export const SENSOR_BLOCKED_TOAST_ID = "test-sensor-blocked";
export const ROUTE_TIMEOUT_MODULE_PATTERN = /no card detected at module (\d+)/;

export const PARKED_PANELS_ROOT_CLASS =
  "fixed top-0 left-0 -z-10 invisible pointer-events-none";
