import type { FieldType, SyncStatus } from "@magic-vault/shared";
import type { PillProps } from "@/lib/interfaces/ui";

export const ADMIN_CARDS_TABS = ["stats", "games", "sync", "database", "keys"] as const;

export const ADMIN_CARDS_STAFF_TABS = ["stats", "games"] as const;

export const ADMIN_CARDS_QUERY_KEY = ["admin", "cards"] as const;

export const ADMIN_ACTIVE_SCANNING_REFRESH_MS = 15_000;
export const ADMIN_SCAN_METRICS_REFRESH_MS = 60_000;
export const ADMIN_SCAN_VECTORIZE_STATS_REFRESH_MS = 30_000;
export const ADMIN_SYNC_STATUS_RUNNING_REFRESH_MS = 2_000;
export const ADMIN_DEFAULT_ACTIVE_SCANNING_WINDOW_MINUTES = 5;

export const ADMIN_FAILURE_STATUSES_WITH_MESSAGE = [400, 404, 409, 422, 502];

export const ADMIN_SYNC_LOG_VISIBLE_LINES = 200;

export const ADMIN_CATALOG_CARDS_PAGE_SIZE = 50;

export const ADMIN_DUMP_ALL_GAMES_SCOPE = "__all__";

export const ADMIN_DELETE_CONFIRM_KEYWORD = "delete";

export const ADMIN_DEFAULT_SYNC_LANGUAGE = "en";

export const GAME_FIELD_TYPES_WITH_OPTIONS: readonly FieldType[] = ["enum", "set"];

export const GAME_EDITOR_VALIDATION_KEYS = {
  required: "admin.cards.gameForm.validation.required",
  keyFormat: "admin.cards.gameForm.validation.keyFormat",
  keyTaken: "admin.cards.gameForm.validation.keyTaken",
  urlFormat: "admin.cards.gameForm.validation.urlFormat",
  minFields: "admin.cards.gameForm.validation.minFields",
  thicknessPositive: "admin.cards.gameForm.validation.thicknessPositive",
} as const;

export const CARD_SYNC_STATUS_TONES: Record<SyncStatus, NonNullable<PillProps["tone"]>> = {
  idle: "neutral",
  running: "info",
  completed: "success",
  failed: "destructive",
  cancelled: "warning",
};
