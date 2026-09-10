import type { ScannerStatus } from "@magic-vault/shared";

export const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
];

export const MTG_ASPECT_RATIO = 2.5 / 3.5;
export const CLOSE_MATCH_DELTA = 0.05;
export const PHONE_CAMERA_JPEG_QUALITY = 0.85;
export const CATCH_ALL_BIN = 7;
