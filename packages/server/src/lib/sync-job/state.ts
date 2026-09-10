import type { SyncState } from "@magic-vault/shared";

type SseWriter = (event: string, data: unknown) => void;

const INITIAL_STATE: SyncState = {
  status: "idle",
  gameKey: "",
  lang: "en",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

let state: SyncState = INITIAL_STATE;
let cancelFlag = false;
let abortController: AbortController | null = null;
const writers = new Set<SseWriter>();

function emit(event: string, data: unknown): void {
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {}
  }
}

// A snapshot safe to hand to an SSE client or API response - cloned so the
// caller can't accidentally mutate the job's own state.
export function getStatus(): SyncState {
  return { ...state, logs: [...state.logs] };
}

// Fast internal read for the sync loop's own hot path (no cloning) - never
// mutate the object this returns.
export function getState(): Readonly<SyncState> {
  return state;
}

export function resetState(next: SyncState): void {
  state = next;
  emit("status", getStatus());
}

export function patchState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
}

export function incrementCounters(delta: {
  processed?: number;
  skipped?: number;
  errors?: number;
}): void {
  state = {
    ...state,
    processed: state.processed + (delta.processed ?? 0),
    skipped: state.skipped + (delta.skipped ?? 0),
    errors: state.errors + (delta.errors ?? 0),
  };
}

export function addLog(msg: string): void {
  state = { ...state, logs: [...state.logs.slice(-199), msg] };
  emit("log", { line: msg });
}

export function emitEvent(event: string, data: unknown): void {
  emit(event, data);
}

export function subscribeSSE(writer: SseWriter): () => void {
  writers.add(writer);
  writer("status", getStatus());
  return () => writers.delete(writer);
}

export function isCancelled(): boolean {
  return cancelFlag;
}

export function getAbortSignal(): AbortSignal | undefined {
  return abortController?.signal;
}

// Called once at the start of a run - resets the cancel flag and hands back
// a fresh AbortController for the fetches that run belongs to.
export function beginRun(): void {
  cancelFlag = false;
  abortController = new AbortController();
}

export function cancelSync(): void {
  if (state.status === "running") {
    cancelFlag = true;
    abortController?.abort();
  }
}
