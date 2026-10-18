import type {
  AdminUnmatchedOcrResult,
  AdminUnmatchedRetryResult,
  AdminUnmatchedScan,
  DeletedItemType,
  PlatformDiscordChannelKey,
  PlatformDiscordGuildSummary,
  SyncState,
} from "@magic-vault/shared";
import type { PlatformDiscordChannelsFormValues } from "@/schemas/platform-discord-channels.schema";
import type { UseFormReturn } from "react-hook-form";

export type DeletedItemTypeFilter = DeletedItemType | "all";

export type UnmatchedPhotoFilter = "all" | "bad" | "good";

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

export interface PlatformDiscordChannelFieldsProps {
  form: UseFormReturn<PlatformDiscordChannelsFormValues>;
  channelKey: PlatformDiscordChannelKey;
  guilds: PlatformDiscordGuildSummary[];
  botReachable: boolean;
}

export interface DiscordGuildSelectProps {
  value: string | null;
  guilds: PlatformDiscordGuildSummary[];
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

export interface UnmatchedRetryResultProps {
  result: AdminUnmatchedRetryResult;
}

export interface UnmatchedScanDetailDialogProps {
  scan: AdminUnmatchedScan | null;
  result: AdminUnmatchedRetryResult | undefined;
  isRetrying: boolean;
  onRetry: (scanId: string) => void;
  isBadPhoto: boolean;
  onToggleBadPhoto: (scanId: string) => void;
  ocrResult: AdminUnmatchedOcrResult | undefined;
  isRunningOcr: boolean;
  onRunOcr: (scanId: string) => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
}

export interface BadPhotoMarks {
  isBad: (scanId: string) => boolean;
  toggle: (scanId: string) => void;
}

export interface UnmatchedOcrPanelProps {
  result: AdminUnmatchedOcrResult | undefined;
  isRunning: boolean;
  canRun: boolean;
  onRun: () => void;
}

export interface UnmatchedOcrOverlayProps {
  result: AdminUnmatchedOcrResult | undefined;
}
