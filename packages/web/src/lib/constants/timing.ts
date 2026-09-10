// Every hardcoded delay/interval/debounce duration in the app, combined so
// the same kind of wait (e.g. a search debounce) uses one shared value.

export const APP_LOADING_TRANSITION_MS = 500;
export const LIVE_CLOCK_TICK_MS = 1000;
export const SEARCH_DEBOUNCE_MS = 300;

export const CAPTURE_FLASH_MS = 300;
export const PRESENCE_TIMEOUT_MS = 8000;
export const CAPTURE_TIMEOUT_MS = 8000;
export const HEARTBEAT_INTERVAL_MS = 3000;
export const IDLE_THRESHOLD_MS = 5_000;
export const DOCUMENT_TITLE_CYCLE_MS = 4000;
export const APP_VERSION_CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Guided-tour steps that navigate/switch section before continuing wait this
// long for the resulting re-render to settle before the next tour step runs.
export const TOUR_STEP_NAVIGATION_DELAY_MS = 60;

export const FEEDER_PREVIEW_DEBOUNCE_MS = 30;
export const SCAN_REGION_PHONE_SYNC_DELAY_MS = 80;
export const CALIBRATION_STEP_SETTLE_MS = 500;
