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
export const CONSENSUS_MAX_VOTE_DISTANCE = 0.7;
export const CARD_DETECTION_RETRY_TIMEOUT_MS = 1000;
export const CARD_DETECTION_RETRY_INTERVAL_MS = 100;

export const HAND_SCAN_STABLE_TICKS = 3;
export const HAND_SCAN_REMOVAL_TICKS = 2;
export const HAND_SCAN_MAX_CORNER_SHIFT_RATIO = 0.02;
export const HAND_SCAN_REARM_SHIFT_RATIO = 0.12;

export const OUTLINE_SMOOTHING_MS = 90;
export const OUTLINE_FADE_MS = 140;
export const OUTLINE_SNAP_OPACITY = 0.05;
export const OUTLINE_SETTLED_PX = 0.5;

export const PRINTING_SCORE_SET_CODE_MAX_LENGTH = 64;
export const PRINTING_SCORE_CARD_ID_MAX_LENGTH = 1024;
