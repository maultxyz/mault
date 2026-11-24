import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  STORED_SNAPSHOT_DIRTY_LOCK_TIMEOUT_MS,
  STORED_SNAPSHOT_MAX_AGE_MS,
  STORED_SNAPSHOT_MINIMUM_MS_BETWEEN_REFRESHES,
  STORED_SNAPSHOT_REFRESH_SPACING_DURATION_FACTOR,
  STORED_SNAPSHOT_REFRESH_STATE_MAX_ENTRIES,
  STORED_SNAPSHOT_PENDING_VERSION_PREFIX,
  STORED_SNAPSHOT_STALE_WAIT_MS,
  STORED_SNAPSHOT_STATE_KEY_SEPARATOR,
} from "./constants/stored-snapshots";
import type {
  ComputedSnapshot,
  StoredSnapshot,
  StoredSnapshotRead,
  StoredSnapshotRefreshState,
  StoredSnapshotRow,
  StoredSnapshotSource,
} from "./interfaces/stored-snapshots";

const refreshStateByKey = new Map<string, StoredSnapshotRefreshState>();

export function utcTimestampTextSql(timestamp: SQL): SQL {
  return sql`to_char(${timestamp} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

export function storedSnapshotRefreshSpacingMs(lastDurationMs: number): number {
  return Math.max(
    STORED_SNAPSHOT_MINIMUM_MS_BETWEEN_REFRESHES,
    lastDurationMs * STORED_SNAPSHOT_REFRESH_SPACING_DURATION_FACTOR,
  );
}

export function storedSnapshotIsFresh(
  stored: Omit<StoredSnapshot<unknown>, "payload">,
  pricingKey: string,
  staleKey: string,
): boolean {
  return (
    stored.pricingKey === pricingKey &&
    stored.staleKey === staleKey &&
    !stored.isDirty &&
    stored.ageMs < STORED_SNAPSHOT_MAX_AGE_MS
  );
}

export function toStoredSnapshot<Payload>(
  row: StoredSnapshotRow | undefined,
): StoredSnapshot<Payload> | null {
  if (!row) return null;
  return {
    payload: row.payload as Payload,
    pricingKey: row.pricing_key,
    staleKey: row.stale_key,
    computeStartedAt: row.compute_started_at,
    computeDurationMs: row.compute_duration_ms,
    ageMs: row.age_ms,
    isDirty: row.is_dirty,
  };
}

export function clearDirtyMarksUnderLock(
  advisoryLock: SQL,
  clearMarks: SQL,
): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql.raw(`SET LOCAL lock_timeout = ${STORED_SNAPSHOT_DIRTY_LOCK_TIMEOUT_MS}`),
    );
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${advisoryLock})`);
    await tx.execute(clearMarks);
    const result = await tx.execute(
      sql`SELECT ${utcTimestampTextSql(sql`clock_timestamp()`)} AS started_at`,
    );
    return (result.rows[0] as { started_at: string }).started_at;
  });
}

async function computeAndStore<Payload>(
  source: StoredSnapshotSource<Payload>,
  state: StoredSnapshotRefreshState,
): Promise<ComputedSnapshot<Payload>> {
  const computeStartedAt = await source.clearDirtyMarks().catch((error: unknown) => {
    console.error("Stored stats refresh could not clear dirty marks:", error);
    return null;
  });
  const startedAtMs = Date.now();
  try {
    const payload = await source.compute();
    state.lastDurationMs = Date.now() - startedAtMs;
    if (!computeStartedAt) {
      return { payload, version: `not-stored:${startedAtMs}` };
    }
    await source.store(payload, computeStartedAt, state.lastDurationMs);
    return { payload, version: computeStartedAt };
  } catch (error) {
    if (computeStartedAt) {
      await source.markDirty().catch((markError: unknown) => {
        console.error("Stored stats could not be marked dirty again:", markError);
      });
    }
    throw error;
  }
}

function refreshStateKeyOf<Payload>(source: StoredSnapshotSource<Payload>): string {
  return [source.stateKey, source.pricingKey, source.staleKey].join(STORED_SNAPSHOT_STATE_KEY_SEPARATOR);
}

function refreshStateOf(stateKey: string): StoredSnapshotRefreshState {
  const existing = refreshStateByKey.get(stateKey);
  if (existing) return existing;
  if (refreshStateByKey.size >= STORED_SNAPSHOT_REFRESH_STATE_MAX_ENTRIES) {
    for (const [key, state] of refreshStateByKey) {
      if (!state.inFlight) refreshStateByKey.delete(key);
    }
  }
  const state: StoredSnapshotRefreshState = {
    inFlight: null,
    lastStartedAtMs: 0,
    lastDurationMs: 0,
  };
  refreshStateByKey.set(stateKey, state);
  return state;
}

function startRefresh<Payload>(
  source: StoredSnapshotSource<Payload>,
  state: StoredSnapshotRefreshState,
): Promise<ComputedSnapshot<Payload>> {
  state.lastStartedAtMs = Date.now();
  const refresh = computeAndStore(source, state).finally(() => {
    if (state.inFlight === refresh) state.inFlight = null;
  });
  state.inFlight = refresh;
  return refresh;
}

function waitMs(durationMs: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), durationMs));
}

export async function readStoredSnapshot<Payload>(
  source: StoredSnapshotSource<Payload>,
): Promise<StoredSnapshotRead<Payload>> {
  const stored = await source.loadStored();
  if (stored && storedSnapshotIsFresh(stored, source.pricingKey, source.staleKey)) {
    return {
      payload: stored.payload,
      version: stored.computeStartedAt,
      isRefreshing: false,
    };
  }

  const state = refreshStateOf(refreshStateKeyOf(source));
  const inFlight = state.inFlight as Promise<ComputedSnapshot<Payload>> | null;
  if (!stored || stored.pricingKey !== source.pricingKey) {
    const refresh = inFlight ?? startRefresh(source, state);
    if (!source.pendingPayload) {
      const computed = await refresh;
      return { ...computed, isRefreshing: false };
    }
    const computed = await Promise.race([
      refresh.catch((error: unknown) => {
        console.error("Stored stats refresh failed:", error);
        return null;
      }),
      waitMs(STORED_SNAPSHOT_STALE_WAIT_MS),
    ]);
    if (computed) return { ...computed, isRefreshing: false };
    return {
      payload: await source.pendingPayload(stored?.payload ?? null),
      version: `${STORED_SNAPSHOT_PENDING_VERSION_PREFIX}${state.lastStartedAtMs}`,
      isRefreshing: true,
    };
  }

  const staleRead: StoredSnapshotRead<Payload> = {
    payload: stored.payload,
    version: stored.computeStartedAt,
    isRefreshing: true,
  };
  const spacingMs = storedSnapshotRefreshSpacingMs(
    Math.max(state.lastDurationMs, stored.computeDurationMs),
  );
  const refresh =
    inFlight ??
    (Date.now() - state.lastStartedAtMs >= spacingMs
      ? startRefresh(source, state)
      : null);
  if (!refresh) return staleRead;
  if (source.servesStaleWithoutWaiting) {
    refresh.catch((error: unknown) => {
      console.error("Stored stats refresh failed:", error);
    });
    return staleRead;
  }

  const refreshed = await Promise.race([
    refresh.catch((error: unknown) => {
      console.error("Stored stats refresh failed:", error);
      return null;
    }),
    waitMs(STORED_SNAPSHOT_STALE_WAIT_MS),
  ]);
  return refreshed ? { ...refreshed, isRefreshing: false } : staleRead;
}

export async function refreshStoredSnapshot<Payload>(
  source: StoredSnapshotSource<Payload>,
): Promise<ComputedSnapshot<Payload>> {
  const state = refreshStateOf(refreshStateKeyOf(source));
  const inFlight = state.inFlight as Promise<ComputedSnapshot<Payload>> | null;
  return inFlight ?? startRefresh(source, state);
}
