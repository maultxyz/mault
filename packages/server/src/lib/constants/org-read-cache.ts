import { PI_HOST_STATUS_EVENT, SCAN_GIFT_REVEAL_EVENT } from "@magic-vault/shared";
import { PI_SCAN_PENDING_SAVE_EVENT } from "./pi-scan";

export const ORG_EVENTS_WITHOUT_DATA_CHANGES: ReadonlySet<string> = new Set([
  "live_count",
  "session_viewers",
  "viewers_updated",
  "lock_acquired",
  "lock_released",
  SCAN_GIFT_REVEAL_EVENT,
  PI_HOST_STATUS_EVENT,
  PI_SCAN_PENDING_SAVE_EVENT,
]);

export const ORG_EVENTS_WITH_ONLY_CARD_DATA_CHANGES: ReadonlySet<string> = new Set([
  "collections_changed",
]);
