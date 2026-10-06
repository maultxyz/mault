import type { SyncState } from "@magic-vault/shared";

export interface StartMessage {
  type: "start";
  gameKey: string;
  lang: string;
  forceResync: boolean;
  skipUpdatedWithinMs?: number;
  initialState: SyncState;
}

export interface CancelMessage {
  type: "cancel";
}

export type ParentToWorkerMessage = StartMessage | CancelMessage;

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

export type WorkerToParentMessage =
  | PatchStateMessage
  | IncrementCountersMessage
  | AddLogMessage
  | EmitEventMessage;
