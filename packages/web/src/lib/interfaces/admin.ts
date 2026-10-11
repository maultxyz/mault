import type {
  DeletedItemType,
  PlatformStatsGuildSummary,
  SyncState,
} from "@magic-vault/shared";

export type DeletedItemTypeFilter = DeletedItemType | "all";

export interface AdminCard {
  id: number;
  cardId: string;
  gameKey: string;
  lang: string;
  name: string;
  setCode: string;
  updatedAt: string;
}

export interface AdminCardsPage {
  cards: AdminCard[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncSourceInfo {
  gameKey: string;
  label: string;
  languages: string[];
}

export interface CardGameCount {
  gameKey: string;
  count: number;
}

export interface PlanLimitInputProps {
  id: string;
  label: string;
  value: number | null;
  fallback: number;
  invalid: boolean;
  onChange: (value: number | null) => void;
}

export interface CardSyncContextValue {
  syncState: SyncState;
  sources: SyncSourceInfo[];
  isRunning: boolean;
  total: number;
  done: number;
  progress: number;
  elapsedMs: number;
  etaMs: number | null;
  start: (gameKey: string, lang: string, forceResync?: boolean) => void;
  isStarting: boolean;
  cancel: () => void;
  isCancelling: boolean;
}

export interface ImpersonationAuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface DiscordGuildSelectProps {
  value: string | null;
  guilds: PlatformStatsGuildSummary[];
  emptyLabel: string;
  disabled?: boolean;
  onChange: (guildId: string | null) => void;
}

export interface AdminStatTile {
  key: string;
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
}

export interface AdminStatGroupProps {
  heading: string;
  tiles: AdminStatTile[];
  live?: boolean;
}
