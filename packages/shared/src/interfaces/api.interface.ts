import type { PlayingCard } from "./card.interface";

export interface SearchCardMatch {
  id: string;
  cardId: string;
  distance: number;
}

export interface ScryfallListResponse {
  data: PlayingCard[];
  has_more: boolean;
  next_page?: string;
}

export type SyncStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type SyncTargetTable = "cards" | "cards_v2";

export interface SyncState {
  status: SyncStatus;
  gameKey: string;
  lang: string;
  targetTable: SyncTargetTable;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  queued: number;
  startedAt: string | null;
  logs: string[];
  currentCard?: string;
}

export type HealthCheckStatus = "ok" | "error";

export interface HealthCheck {
  name: string;
  status: HealthCheckStatus;
  latencyMs: number;
  message?: string;
  gameKey?: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  checkedAt: string;
  checks: HealthCheck[];
}
