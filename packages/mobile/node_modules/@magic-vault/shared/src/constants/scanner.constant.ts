import type { ScanRegion } from "../interfaces/scanner.interface";

export const DEFAULT_SCAN_REGION: ScanRegion = {
  coverage: 0.85,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_CAPTURE_SETTLE_DELAY_MS = 500;

export const DEFAULT_MATCHES_NEEDED = 1;

export const DEFAULT_CHECK_BOTH_ORIENTATIONS = true;

export const OCR_CROP_WIDTH = 630;
export const OCR_CROP_HEIGHT = 880;
export const CONSENSUS_RETRY_BUDGET = 3;
export const CARD_DETECTION_RETRY_TIMEOUT_MS = 1000;
export const CARD_DETECTION_RETRY_INTERVAL_MS = 100;
