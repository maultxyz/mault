export interface StoredSnapshot<Payload> {
  payload: Payload;
  pricingKey: string;
  staleKey: string;
  computeStartedAt: string;
  computeDurationMs: number;
  ageMs: number;
  isDirty: boolean;
}

export interface StoredSnapshotSource<Payload> {
  stateKey: string;
  pricingKey: string;
  staleKey: string;
  loadStored: () => Promise<StoredSnapshot<Payload> | null>;
  clearDirtyMarks: () => Promise<string>;
  markDirty: () => Promise<void>;
  compute: () => Promise<Payload>;
  store: (
    payload: Payload,
    computeStartedAt: string,
    computeDurationMs: number,
  ) => Promise<void>;
  pendingPayload?: (previousPayload: Payload | null) => Promise<Payload>;
  servesStaleWithoutWaiting?: boolean;
}

export interface ComputedSnapshot<Payload> {
  payload: Payload;
  version: string;
}

export interface StoredSnapshotRead<Payload> extends ComputedSnapshot<Payload> {
  isRefreshing: boolean;
}

export interface StoredSnapshotRefreshState {
  inFlight: Promise<ComputedSnapshot<unknown>> | null;
  lastStartedAtMs: number;
  lastDurationMs: number;
}

export interface StoredSnapshotRow {
  payload: unknown;
  pricing_key: string;
  stale_key: string;
  compute_started_at: string;
  compute_duration_ms: number;
  age_ms: number;
  is_dirty: boolean;
}

export interface StoredOrgCardStatsInput<Payload> {
  orgId: string;
  variant: string;
  pricingKey: string;
  day: string;
  compute: () => Promise<Payload>;
  pendingPayload?: (previousPayload: Payload | null) => Promise<Payload>;
  servesStaleWithoutWaiting?: boolean;
}
