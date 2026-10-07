import { DELETED_ITEM_TYPES, type SyncState } from "@magic-vault/shared";
import type { DeletedItemTypeFilter } from "@/lib/interfaces/admin";
import {
  IconBug,
  IconCards,
  IconCreditCard,
  IconDeviceGamepad2,
  IconRestore,
  IconRotate360,
  IconSpeakerphone,
  IconTerminal2,
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
};

export const ACTIVE_SCANNING_REFRESH_MS = 15_000;

export const ALL_DELETED_ITEM_TYPES = "all";

export const DELETED_ITEM_TYPE_FILTERS: DeletedItemTypeFilter[] = [
  ALL_DELETED_ITEM_TYPES,
  ...DELETED_ITEM_TYPES,
];

export const ADMIN_SECTIONS = [
  { path: "cards", icon: IconCards, labelKey: "sections.cards" },
  { path: "games", icon: IconDeviceGamepad2, labelKey: "sections.games" },
  { path: "users", icon: IconUserScan, labelKey: "sections.users" },
  { path: "plans", icon: IconCreditCard, labelKey: "sections.plans" },
  {
    path: "announcements",
    icon: IconSpeakerphone,
    labelKey: "sections.announcements",
  },
  { path: "deleted", icon: IconRestore, labelKey: "sections.deleted" },
  { path: "servos", icon: IconRotate360, labelKey: "sections.servos" },
  { path: "device", icon: IconTerminal2, labelKey: "sections.device" },
  { path: "developer", icon: IconBug, labelKey: "sections.developer" },
] as const;
