import type { ScanRegion } from "../interfaces/scanner.interface";

export const DEFAULT_SCAN_REGION: ScanRegion = {
  coverage: 0.85,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_CAPTURE_SETTLE_DELAY_MS = 500;

export const DEFAULT_MATCHES_NEEDED = 2;

export const DEFAULT_CHECK_BOTH_ORIENTATIONS = true;
