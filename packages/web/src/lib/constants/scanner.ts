import type { ScanOrientation } from "@/lib/interfaces/scanner";
import type { ScannerStatus } from "@magic-vault/shared";

// The sorter's camera sees cards upside down relative to the dewarp's
// default, so the 180° copy is the one that usually matches.
export const DEFAULT_SCAN_ORIENTATION: ScanOrientation = "rotated";

export const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
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
