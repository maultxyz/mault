import type {
  BrowserSyncWorkCard,
  BrowserSyncWorkFailure,
  BrowserSyncWorkResult,
  SyncState,
  SyncVectorizeOn,
} from "@magic-vault/shared";
import type { SyncSource, SyncSourceCard } from "./card-search";

export interface StartMessage {
  type: "start";
  gameKey: string;
  lang: string;
  forceResync: boolean;
  skipUpdatedWithinMs?: number;
  vectorizeOn: SyncVectorizeOn;
  initialState: SyncState;
}

export interface CancelMessage {
  type: "cancel";
}

export interface ClaimWorkMessage {
  type: "claim";
  requestId: string;
  limit: number;
}

export interface SubmitWorkMessage {
  type: "submit";
  requestId: string;
  results: BrowserSyncWorkResult[];
  failures: BrowserSyncWorkFailure[];
}

export type ParentToWorkerMessage =
  | StartMessage
  | CancelMessage
  | ClaimWorkMessage
  | SubmitWorkMessage;

export interface PatchStateMessage {
  type: "patchState";
  patch: Partial<SyncState>;
}

export interface IncrementCountersMessage {
  type: "incrementCounters";
  delta: { processed?: number; skipped?: number; errors?: number };
}

export interface AddLogMessage {
  type: "addLog";
  msg: string;
}

export interface EmitEventMessage {
  type: "emitEvent";
  event: string;
  data: unknown;
}

export interface WorkResponseMessage {
  type: "workResponse";
  requestId: string;
  cards?: BrowserSyncWorkCard[];
  ok?: boolean;
  message?: string;
}

export type WorkerToParentMessage =
  | PatchStateMessage
  | IncrementCountersMessage
  | AddLogMessage
  | EmitEventMessage
  | WorkResponseMessage;

export interface BrowserQueueHost {
  source: SyncSource;
  lang: string;
  cards: SyncSourceCard[];
  skipped: number;
  addLog: (msg: string) => void;
  patchState: (patch: Partial<SyncState>) => void;
  incrementCounters: (delta: {
    processed?: number;
    skipped?: number;
    errors?: number;
  }) => void;
  emitEvent: (event: string, data: unknown) => void;
  getState: () => SyncState;
  isCancelled: () => boolean;
}

export interface QueuedCard {
  card: SyncSourceCard;
  attempts: number;
}

export interface Lease {
  item: QueuedCard;
  expiresAt: number;
}

export interface QueueState {
  host: BrowserQueueHost;
  pending: QueuedCard[];
  leased: Map<string, Lease>;
  timer: ReturnType<typeof setInterval>;
  announced: boolean;
  settled: boolean;
  submitsInFlight: number;
  resolve: (outcome: "done" | "cancelled") => void;
}

export interface PendingSyncWork {
  resolve: (message: WorkResponseMessage) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface AcceptedBrowserWork {
  item: QueuedCard;
  embedding: number[];
  backEmbedding?: number[];
}

export interface SyncStartBody {
  gameKey?: string;
  lang?: string;
  forceResync?: boolean;
  concurrency?: number;
  vectorizeOn?: SyncVectorizeOn;
}

export interface SyncStartRequest {
  gameKey: string | undefined;
  lang: string;
  forceResync: boolean;
  concurrency: number | undefined;
  vectorizeOn: SyncVectorizeOn;
}

export type SyncStartOutcome =
  | { success: true }
  | { success: false; message: string; status: 400 | 409 };

export interface SyncCardBody {
  gameKey?: string;
  cardId?: string;
  lang?: string;
}
