export const ORG_EVENTS_WITHOUT_DATA_CHANGES: ReadonlySet<string> = new Set([
  "live_count",
  "session_viewers",
  "viewers_updated",
  "lock_acquired",
  "lock_released",
]);

export const ORG_EVENTS_WITH_ONLY_CARD_DATA_CHANGES: ReadonlySet<string> = new Set([
  "collections_changed",
]);
