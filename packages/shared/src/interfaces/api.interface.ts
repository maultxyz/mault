import type { PlayingCard } from "./card.interface";
import type { OcrDiagnostics } from "./ocr-region.interface";
import type { Result } from "./result.interface";

export interface SearchCardMatch {
  id: string;
  cardId: string;
  distance: number;
  confidence: number;
  lang?: string;
  card?: PlayingCard;
}

export type SearchNoMatchReason = "too_far" | "ambiguous" | "empty_index";

export interface SearchCandidateDiagnostic {
  cardId: string;
  name: string;
  setCode: string;
  distance: number;
}

export interface CardSearchDiagnostics {
  reason: SearchNoMatchReason;
  gameKey: string;
  lang: string;
  nearestDistance: number | null;
  runnerUpDistance: number | null;
  runnerUpName: string | null;
  distanceThreshold: number;
  maxDistanceRatio: number;
  candidates: SearchCandidateDiagnostic[];
  embedding?: number[];
}

export interface CardSearchResult extends Result<SearchCardMatch[] | null> {
  nearestDistance?: number | null;
  diagnostics?: CardSearchDiagnostics;
}

export interface CardTextSearchResult extends CardSearchResult {
  ocr?: OcrDiagnostics;
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

export type SyncVectorizeOn = "server" | "browser";

export interface SyncState {
  status: SyncStatus;
  gameKey: string;
  lang: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  queued: number;
  startedAt: string | null;
  logs: string[];
  currentCard?: string;
  vectorizeOn: SyncVectorizeOn;
  acceptingWork: boolean;
  concurrency?: number;
}

export interface BrowserSyncWorkCard {
  cardId: string;
  name: string;
  imageUrl: string;
  backImageUrl?: string;
}

export interface BrowserSyncWorkResult {
  cardId: string;
  embedding: number[];
  backEmbedding?: number[];
}

export interface BrowserSyncWorkFailure {
  cardId: string;
  message: string;
}

export type HealthCheckStatus = "ok" | "error";

export interface HealthCheck {
  name: string;
  status: HealthCheckStatus;
  latencyMs: number;
  message?: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  checkedAt: string;
  checks: HealthCheck[];
}
