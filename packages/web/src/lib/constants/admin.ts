import {
  BROWSER_SYNC_PARALLEL,
  DELETED_ITEM_TYPES,
  SYNC_VECTORIZE_CONCURRENCY_MAX,
  type SyncState,
} from "@magic-vault/shared";
import type {
  DeletedItemTypeFilter,
  UnmatchedPhotoFilter,
} from "@/lib/interfaces/admin";
import type { PlatformDiscordChannelsFormValues } from "@/schemas/platform-discord-channels.schema";
import type { PlatformDiscordLinkedRoleFormValues } from "@/schemas/platform-discord-linked-role.schema";
import type { PlatformStatsFormValues } from "@/schemas/platform-stats.schema";
import {
  IconBrandDiscord,
  IconBug,
  IconCards,
  IconCreditCard,
  IconRestore,
  IconRotate360,
  IconUserScan,
} from "@tabler/icons-react";

export const DEFAULT_SYNC_STATE: SyncState = {
  status: "idle",
  gameKey: "",
  lang: "en",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  queued: 0,
  startedAt: null,
  logs: [],
  vectorizeOn: "server",
  acceptingWork: false,
};

export const BROWSER_SYNC_POLL_MS = 400;

export function isBrowserSaveLog(line: string): boolean {
  return /\] saved \d+ cards from a browser$/.test(line);
}

export function browserSyncParallel(value: number | undefined): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= SYNC_VECTORIZE_CONCURRENCY_MAX
  ) {
    return value;
  }
  return BROWSER_SYNC_PARALLEL;
}

export const ACTIVE_SCANNING_REFRESH_MS = 15_000;
export const SCAN_METRICS_REFRESH_MS = 60_000;
export const SCAN_VECTORIZE_STATS_REFRESH_MS = 30_000;

export const ALL_DELETED_ITEM_TYPES = "all";

export const DELETED_ITEM_TYPE_FILTERS: DeletedItemTypeFilter[] = [
  ALL_DELETED_ITEM_TYPES,
  ...DELETED_ITEM_TYPES,
];

export const UNMATCHED_PHOTO_FILTERS: UnmatchedPhotoFilter[] = [
  "all",
  "good",
  "bad",
];

export const BAD_PHOTO_MARKS_STORAGE_KEY = "admin-unmatched-bad-photos";

export const ADMIN_SECTIONS = [
  { path: "cards", icon: IconCards, labelKey: "sections.cards" },
  { path: "users", icon: IconUserScan, labelKey: "sections.users" },
  { path: "plans", icon: IconCreditCard, labelKey: "sections.plans" },
  { path: "discord", icon: IconBrandDiscord, labelKey: "sections.discord" },
  { path: "deleted", icon: IconRestore, labelKey: "sections.deleted" },
  { path: "hardware", icon: IconRotate360, labelKey: "sections.hardware" },
  { path: "developer", icon: IconBug, labelKey: "sections.developer" },
] as const;

export const NO_DISCORD_GUILD = "none";

export const PLATFORM_STATS_SCRIPT_COMMAND =
  "node packages/server/dist/scripts/post-platform-stats.js";

export const PRICE_SYNC_SCRIPT_COMMAND =
  "node packages/server/dist/scripts/sync-prices.js";

export const EMPTY_PLATFORM_STATS_FORM: PlatformStatsFormValues = {
  stats: [],
};

export const EMPTY_PLATFORM_DISCORD_LINKED_ROLE_FORM: PlatformDiscordLinkedRoleFormValues =
  { guildId: null, roleId: null };

export const EMPTY_PLATFORM_DISCORD_CHANNELS_FORM: PlatformDiscordChannelsFormValues =
  {
    stats: { guildId: null, channelId: null },
    donations: { guildId: null, channelId: null },
    pricing: { guildId: null, channelId: null },
  };

export const BROWSER_EMBED_TIMEOUT_MS = 60_000;
export const BROWSER_EMBED_WORKER_MAX = 2;
