import type { ScannerStatus } from "@magic-vault/shared";

export const SCANNABLE_STATUSES: ScannerStatus[] = [
  "scanning",
  "no-match",
  "duplicate",
];

export const MTG_ASPECT_RATIO = 2.5 / 3.5;

// How much closer the runner-up match must be (as a fraction of distance)
// before it's shown as an alternative rather than discarded.
export const CLOSE_MATCH_DELTA = 0.05;

export const PHONE_CAMERA_JPEG_QUALITY = 0.85;

// Bin 7 is the app-wide default catch-all (the bottom chute of the default
// 3-module layout) — used as a fixed convention in demos/fallbacks rather
// than derived from the current module count.
export const CATCH_ALL_BIN = 7;
