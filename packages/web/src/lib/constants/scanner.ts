import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import {
  type CollectionCardsQuery,
  type ScannerStatus,
  EMPTY_CARD_FILTERS,
} from "@magic-vault/shared";
import { runtimeEnv } from "@/lib/runtime-env";

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
export const UNMATCHED_VIEW_PARAM = "unmatched";
export const UNMATCHED_CARD_PARAM = "unmatchedCard";
export const PHONE_CAMERA_JPEG_QUALITY = 0.85;
export const CATCH_ALL_BIN = 7;

export const STALE_DEVICE_THRESHOLD_DAYS = 30;

export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;
export const PHONE_CAMERA_DEVICE_STORAGE_KEY = "mault:phone-camera-device-id";

export const JAM_TOAST_ID_PREFIX = "jam-module-";
export const JAM_COMMAND_TIMEOUT_MS = 3000;
export const JAM_CLEAR_DEVICE_TIMEOUT_MS = 10000;
export const JAM_VERIFY_SAMPLES = 3;
export const JAM_VERIFY_INTERVAL_MS = 750;
export const SCAN_POSITION_MODULE = 1;
export const MONITOR_OPEN_CARD_PARAM = "card";
export const CARD_SETS_STALE_MS = 15 * 60 * 1000;
export const CARD_SET_PICKER_LIMIT = 100;
export const MONITOR_NEEDS_REVIEW_CARDS_QUERY: CollectionCardsQuery = {
  ...ALL_CARDS_QUERY,
  filters: { ...EMPTY_CARD_FILTERS, needsAttention: true },
  unreviewed: true,
};
export const SENSOR_BLOCKED_TOAST_ID = "test-sensor-blocked";
export const SESSION_LOCK_ALERT_ID = "session-lock";
export const ROUTE_TIMEOUT_MODULE_PATTERN = /no card detected at module (\d+)/;

export const PARKED_PANELS_ROOT_CLASS =
  "fixed top-0 left-0 -z-10 invisible pointer-events-none";


export const UNMATCHED_RATE_WINDOW = 20;
export const UNMATCHED_RATE_MIN_SCANS = 10;
export const UNMATCHED_RATE_THRESHOLD = 0.3;
export const UNMATCHED_RATE_TOAST_COOLDOWN_MS = 30 * 60 * 1000;
export const UNMATCHED_RATE_TOAST_ID = "unmatched-rate";

export const SHOW_SCAN_LOGS = runtimeEnv("VITE_SHOW_SCAN_LOGS") === "true";

export const ONNX_RUNTIME_FAILURE_TOAST_ID = "onnx-runtime-failure";

export const SCAN_IMAGE_URL_STALE_MS = 50 * 60 * 1000;

export const AUTO_CONNECT_PLUG_DELAY_MS = 1000;
export const AUTO_CONNECT_SETTLE_MS = 750;

export const SCAN_RATE_BUCKET_MS = 60_000;
export const SCAN_RATE_BUCKET_COUNT = 12;
export const SCAN_RATE_WINDOW_MS = SCAN_RATE_BUCKET_MS * SCAN_RATE_BUCKET_COUNT;
export const SCAN_RATE_REFRESH_MS = 5_000;

export const BIN_LEVEL_WARNING_PERCENT = 70;
export const BIN_LEVEL_FULL_PERCENT = 90;

export const SORTERS_OVERVIEW_PATH = "/app/sorters";

export const CORRECTION_AUTO_CLOSE_TICK_MS = 100;
export const CORRECTION_AUTO_CLOSE_DONE_DELAY_MS = 700;
export const CORRECTION_TIMER_RADIUS = 16;
export const CORRECTION_TIMER_CIRCUMFERENCE =
  2 * Math.PI * CORRECTION_TIMER_RADIUS;

export const SCANNER_LIVE_DETECTION_INTERVAL_MS = 300;

export const HAND_SCAN_REARM_FINGERPRINT_DIFF = 0.08;
export const HAND_SCAN_FINGERPRINT_SIZE = 16;
export const HAND_SCAN_TRACKING_STATUSES: ScannerStatus[] = [
  "scanning",
  "paused",
  "settling",
  "no-match",
  "duplicate",
];

export const LIVE_DETECTION_STATUSES: ScannerStatus[] = [
  "scanning",
  "paused",
  "settling",
];


export const DOCUMENT_TITLE_BASE = "MAULT";

export const BIN_CORRECTION_CONFIRM_KEYS = ["Enter", " "];

export const PHONE_CAMERA_PATH_PATTERN = /^\/app\/monitor\/[^/]+\/camera\/?$/;
export const QR_SCAN_INTERVAL_MS = 250;
export const QR_SCAN_MAX_DIMENSION = 640;

export const PENDING_SCAN_SAVES_DB_NAME = "magic-vault-pending-scan-saves";
export const PENDING_SCAN_SAVES_STORE_NAME = "saves";
export const PENDING_SCAN_SAVES_DB_VERSION = 1;
export const PENDING_SCAN_SAVE_RETRY_DELAYS_MS = [
  2000, 5000, 10_000, 30_000, 60_000,
];
export const PENDING_SCAN_SAVE_RETRYABLE_STATUSES = [401, 408, 429];
export const PENDING_SCAN_SAVES_TOAST_ID = "pending-scan-saves";

export const SCAN_REGION_MASK_FILL = "rgb(0 0 0 / 0.4)";
export const SCAN_REGION_MASK_STROKE = "rgb(255 255 255 / 0.9)";

export const MOBILE_SCAN_CHIP_CLASS =
  "pointer-events-auto inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur-md active:bg-black/70";
export const MOBILE_SCAN_PANEL_CLASS =
  "pointer-events-auto rounded-xl bg-black/60 p-3 text-white backdrop-blur-md";
