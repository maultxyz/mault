import type { StationStatus } from "@/lib/interfaces/stations";
import { PI_SCAN_SESSION_PATH } from "@magic-vault/shared";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import {
  type CollectionCardsQuery,
  type PiScanSessionState,
  type ScannerStatus,
  EMPTY_CARD_FILTERS,
} from "@magic-vault/shared";
import { runtimeEnv } from "@/lib/runtime-env";
import type { CommLogEntry, DesktopScannerIcon } from "@magic-vault/shared";
import type {
  FlatbedPlacement,
  FlatbedScanStep,
  ScannerConnectionState,
} from "@/lib/interfaces/scanner";
import {
  IconArrowBarToDown,
  IconBolt,
  IconPlayerPause,
  IconPlayerPlay,
  type Icon,
} from "@tabler/icons-react";

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

export const PI_SCAN_CARD_EVENTS = [
  "card_added",
  "unmatched_added",
  "card_removed",
  "cards_removed",
  "unmatched_removed",
] as const;

export const STALE_DEVICE_THRESHOLD_DAYS = 30;

export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;
export const PI_CAMERA_BASE = "/api/pi-camera";
export const PI_CAMERA_DEVICE_ID = "pi-webcam";
export const PI_CAMERA_WIDTH = CAMERA_IDEAL_WIDTH;
export const PI_CAMERA_HEIGHT = CAMERA_IDEAL_HEIGHT;
export const PI_CAMERA_LABEL = "USB Live camera";
export const PI_SERIAL_OPEN_TIMEOUT_MS = 8000;

export const IDLE_PI_SCAN_SESSION: PiScanSessionState = {
  phase: "idle",
  collectionGuid: null,
  message: null,
  cardsScanned: 0,
  stopping: false,
  activity: null,
  current: null,
  lastCard: null,
  startedAt: null,
  pausedMs: 0,
  pausedAt: null,
  autoFeed: true,
};
export const PHONE_CAMERA_DEVICE_STORAGE_KEY = "mault:phone-camera-device-id";

export const JAM_TOAST_ID_PREFIX = "jam-module-";
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
export const SCANNER_CONTROL_QR_MAX_DIMENSION = 1024;
export const SCANNER_CONNECTION_DOT_CLASS: Record<
  ScannerConnectionState,
  string
> = {
  connected: "bg-success",
  connecting: "bg-warning",
  disconnected: "bg-foreground/30",
};

export const PENDING_SCAN_SAVES_DB_NAME = "magic-vault-pending-scan-saves";
export const PENDING_SCAN_SAVES_STORE_NAME = "saves";
export const PENDING_SCAN_SAVES_DB_VERSION = 1;
export const PENDING_SCAN_SAVES_TOAST_ID = "pending-scan-saves";

export const SCAN_REGION_MASK_FILL = "rgb(0 0 0 / 0.4)";
export const SCAN_REGION_MASK_STROKE = "rgb(255 255 255 / 0.9)";

export const MOBILE_SCAN_CHIP_CLASS =
  "pointer-events-auto inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg bg-black/55 px-3 text-sm font-medium text-white backdrop-blur-md active:bg-black/70";
export const MOBILE_SCAN_PANEL_CLASS =
  "pointer-events-auto rounded-xl bg-black/60 p-3 text-white backdrop-blur-md";

export const PI_CAMERA_PREVIEW_INTERVAL_MS = 250;

export const PI_SCAN_SESSION_API = `/api${PI_SCAN_SESSION_PATH}`;
export const COMM_LOG_MARKER_LABELS: Partial<
  Record<CommLogEntry["direction"], string>
> = {
  connected: "New connection",
  disconnected: "Disconnected",
  restarted: "Sorter restarted",
};

export const DESKTOP_PIP_OPEN_DELAY_MS = 400;
export const DESKTOP_PIP_DRAG_THRESHOLD_PX = 4;
export const DESKTOP_PIP_CONTROL_ICONS: Record<DesktopScannerIcon, Icon> = {
  play: IconPlayerPlay,
  pause: IconPlayerPause,
  "auto-feed-on": IconBolt,
  "auto-feed-off": IconBolt,
  "clear-device": IconArrowBarToDown,
};

export const SCAN_IMAGE_IMPORT_ACCEPT = "image/jpeg,image/png,image/webp";
export const SCAN_IMAGE_IMPORT_MAX_DIMENSION_PX = 1600;
export const SCAN_IMAGE_IMPORT_PADDING_RATIO = 0.08;
export const SCAN_IMAGE_IMPORT_PADDING_COLOR = "#808080";
export const SCAN_IMAGE_IMPORT_MATCHES_NEEDED = 1;
export const SCAN_IMAGE_IMPORT_CHECK_BOTH_ORIENTATIONS = true;
export const DOCUMENT_SCANNERS_QUERY_KEY = ["desktop", "document-scanners"] as const;
export const DOCUMENT_SCAN_FOLDER_QUERY_KEY = ["desktop", "document-scan-folder"] as const;
export const DOCUMENT_SCANNER_CAMERA_ID_PREFIX = "document-scanner:";
export const DOCUMENT_SCANNER_CARD_ARRIVAL_TIMEOUT_MS = 4000;
export const DOCUMENT_SCANNER_FLATBED_CARD_ARRIVAL_TIMEOUT_MS = 30000;
export const DOCUMENT_SCANNER_CARD_ARRIVAL_POLL_MS = 150;
export const DOCUMENT_SCANNER_IGNORED_IR_DROP_WAIT_MS = 1500;
export const DOCUMENT_SCANNER_MODES = ["feeder", "flatbed"] as const;
export const FLATBED_DEFAULT_PLACEMENT: FlatbedPlacement = {
  leftMm: 0,
  topMm: 0,
  widthMm: 70,
  heightMm: 95,
};
export const FLATBED_SCAN_MARGIN_MM = 4;
export const FLATBED_DEFAULT_GLASS_WIDTH_MM = 216;
export const FLATBED_MIN_PLACEMENT_MM = 40;
export const FLATBED_DETECTION_MAX_DIMENSION_PX = 600;
export const FLATBED_DETECTION_DARK_LUMINANCE = 200;
export const FLATBED_DETECTION_MIN_DARK_PIXELS_PER_LINE = 3;
export const FLATBED_DETECTION_PADDING_MM = 2;
export const FLATBED_CROPPED_PAGE_QUALITY = 0.92;
export const FLATBED_COUNTDOWN_TICK_MS = 250;
export const FLATBED_IDLE_STEPS: readonly FlatbedScanStep[] = [
  "place-card",
  "done",
];

export const STATION_STATUS_BADGE_VARIANTS: Record<
  StationStatus,
  "success" | "warning" | "outline"
> = {
  sorting: "success",
  paused: "warning",
  offline: "outline",
};

export const SORTERS_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export const FLATBED_OVERRIDDEN_STATUSES: ScannerStatus[] = [
  "error",
  "duplicate",
  "no-match",
];
