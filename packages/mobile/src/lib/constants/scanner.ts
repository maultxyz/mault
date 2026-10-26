import { Platform } from "react-native";
import type { ScanMode, ScannerPauseReason, ScannerPhase, ScanRemovalNoticeKind } from "@/lib/interfaces/scanner";

export const BIN_DATA_RETRY_MS = 5000;
export const CAPTURE_TARGET_RESOLUTION = { width: 1080, height: 1920 } as const;
export const WORKING_LONG_SIDE = 1280;
export const SCANNER_CONTROL_QR_LONG_SIDE = 960;
export const CONTROL_CARD_NOTICE_DURATION_MS = 4000;
export const CAPTURED_IMAGE_JPEG_QUALITY = 80;
export const OCR_IMAGE_JPEG_QUALITY = 90;
export const DETECTOR_SESSION_KEY = "detector";
export const MILO_SESSION_KEY = "milo";
export const SESSION_FEED_LIMIT = 500;
export const SESSION_FEED_IMAGE_LIMIT = 30;
export const RUNNING_PHASES: ScannerPhase[] = ["feeding", "capturing", "identifying", "routing"];
export const CAMERA_ASPECT_RATIO = 3 / 4;
export const PAUSE_TONES = {
  user: "info",
  duplicate: "warning",
  "repack-complete": "success",
  "no-match": "info",
  "feeder-empty": "warning",
  "no-card": "warning",
  "bin-full": "warning",
  "scan-limit": "warning",
  "sorter-limit": "warning",
  "collection-locked": "warning",
  "feed-failed": "destructive",
  "route-failed": "destructive",
  jam: "destructive",
  "save-failed": "destructive",
  "sorter-disconnected": "destructive",
  "bin-data-unavailable": "warning",
  deploy: "info",
  "control-card": "info",
  "control-card-unreadable": "destructive",
  "control-card-collection-not-found": "destructive",
  "control-card-preset-not-found": "destructive",
  "control-card-preset-wrong-game": "destructive",
  "control-card-no-collection": "destructive",
  "control-card-switch-failed": "destructive",
} as const satisfies Record<ScannerPauseReason, string>;
export const SCAN_REGION_MASK_OPACITY = 0.4;
export const SCAN_REGION_STROKE_OPACITY = 0.9;
export const SCAN_REGION_VIRTUAL_HEIGHT = 1000;
export const SVG_MASK_SHOW = "#ffffff";
export const SVG_MASK_HIDE = "#000000";
export const LIVE_DETECTION_INTERVAL_MS = 300;
export const LIVE_CORNERS_SUPPORTED = Platform.OS === "android";
export const LIVE_DETECTION_PAUSED_PHASES: ScannerPhase[] = ["loading-models", "capturing", "identifying", "error"];

export const NOT_FOIL_OPTION = "none";
export const ANY_SET_OPTION = "any";
export const CARD_SET_PICKER_LIMIT = 100;

export const SCAN_REMOVAL_NOTICE_DURATION_MS = 3000;
export const SCAN_MODES: readonly ScanMode[] = ["add", "remove"];

export const SCAN_REMOVAL_NOTICE_TONES = {
  "no-match": "info",
  "lookup-failed": "destructive",
  removed: "success",
} as const satisfies Record<ScanRemovalNoticeKind, string>;
