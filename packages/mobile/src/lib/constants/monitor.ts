import type { MonitorState } from "@/lib/interfaces/scanner";

export const STREAM_RECONNECT_DELAY_MS = 3000;
export const MONITOR_MAX_ERRORS = 5;
export const MONITOR_EVENTS = [
  "session_init",
  "viewers_updated",
  "card_added",
  "card_updated",
  "card_removed",
  "cards_removed",
  "cards_cleared",
  "unmatched_added",
  "unmatched_removed",
  "unmatched_cleared",
  "scan_error",
] as const;

export const INITIAL_MONITOR_STATE: MonitorState = {
  status: "connecting",
  collectionName: null,
  recentCards: [],
  unmatchedCount: 0,
  viewerCount: 0,
  errors: [],
};
