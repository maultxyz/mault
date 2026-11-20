import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import {
  STORED_SNAPSHOT_MAX_AGE_MS,
  STORED_SNAPSHOT_MINIMUM_MS_BETWEEN_REFRESHES,
} from "../src/lib/constants/stored-snapshots";
import type {
  StoredSnapshot,
  StoredSnapshotSource,
} from "../src/lib/interfaces/stored-snapshots";
import {
  readStoredSnapshot,
  storedSnapshotIsFresh,
  storedSnapshotRefreshSpacingMs,
} from "../src/lib/stored-snapshots";
import { isUnfilteredCardsQuery } from "../src/routes/collections/cards-query";

const stored: StoredSnapshot<string> = {
  payload: "stored",
  pricingKey: "pricing",
  staleKey: "2026-11-20",
  computeStartedAt: "2026-11-20T10:00:00.000000Z",
  computeDurationMs: 40,
  ageMs: 1_000,
  isDirty: false,
};

function sourceFor(
  stateKey: string,
  storedSnapshot: StoredSnapshot<string> | null,
  overrides: Partial<StoredSnapshotSource<string>> = {},
) {
  const calls = { clearDirtyMarks: 0, compute: 0, store: 0, markDirty: 0 };
  const source: StoredSnapshotSource<string> = {
    stateKey,
    pricingKey: "pricing",
    staleKey: "2026-11-20",
    loadStored: async () => storedSnapshot,
    clearDirtyMarks: async () => {
      calls.clearDirtyMarks += 1;
      return "2026-11-20T11:00:00.000000Z";
    },
    markDirty: async () => {
      calls.markDirty += 1;
    },
    compute: async () => {
      calls.compute += 1;
      return "computed";
    },
    store: async () => {
      calls.store += 1;
    },
    ...overrides,
  };
  return { source, calls };
}

test("stored stats: fresh only while clean, recent, priced the same way and from the same day", () => {
  assert.equal(storedSnapshotIsFresh(stored, "pricing", "2026-11-20"), true);
  assert.equal(storedSnapshotIsFresh({ ...stored, isDirty: true }, "pricing", "2026-11-20"), false);
  assert.equal(storedSnapshotIsFresh(stored, "other pricing", "2026-11-20"), false);
  assert.equal(storedSnapshotIsFresh(stored, "pricing", "2026-11-21"), false);
  assert.equal(
    storedSnapshotIsFresh({ ...stored, ageMs: STORED_SNAPSHOT_MAX_AGE_MS }, "pricing", "2026-11-20"),
    false,
  );
});

test("stored stats: slow refreshes are spaced further apart", () => {
  assert.equal(storedSnapshotRefreshSpacingMs(40), STORED_SNAPSHOT_MINIMUM_MS_BETWEEN_REFRESHES);
  assert.equal(storedSnapshotRefreshSpacingMs(10_000), 100_000);
});

test("stored stats: a fresh snapshot is served without computing", async () => {
  const { source, calls } = sourceFor("fresh", stored);
  const read = await readStoredSnapshot(source);
  assert.deepEqual(read, { payload: "stored", version: stored.computeStartedAt, isRefreshing: false });
  assert.equal(calls.compute, 0);
});

test("stored stats: a missing snapshot is computed, stored and returned", async () => {
  const { source, calls } = sourceFor("missing", null);
  const read = await readStoredSnapshot(source);
  assert.deepEqual(read, { payload: "computed", version: "2026-11-20T11:00:00.000000Z", isRefreshing: false });
  assert.deepEqual(calls, { clearDirtyMarks: 1, compute: 1, store: 1, markDirty: 0 });
});

test("stored stats: a snapshot priced differently is never served", async () => {
  const { source, calls } = sourceFor("repriced", { ...stored, pricingKey: "old pricing" });
  const read = await readStoredSnapshot(source);
  assert.equal(read.payload, "computed");
  assert.equal(calls.compute, 1);
});

test("stored stats: a dirty snapshot is refreshed in time when the refresh is quick", async () => {
  const { source, calls } = sourceFor("dirty-quick", { ...stored, isDirty: true });
  const read = await readStoredSnapshot(source);
  assert.deepEqual(read, { payload: "computed", version: "2026-11-20T11:00:00.000000Z", isRefreshing: false });
  assert.equal(calls.store, 1);
});

test("stored stats: a slow refresh serves the stale snapshot and is not started twice", async () => {
  let finishCompute: (value: string) => void = () => {};
  const { source, calls } = sourceFor(
    "dirty-slow",
    { ...stored, isDirty: true },
    {
      compute: () =>
        new Promise<string>((resolve) => {
          calls.compute += 1;
          finishCompute = resolve;
        }),
    },
  );
  const [first, second] = await Promise.all([
    readStoredSnapshot(source),
    readStoredSnapshot(source),
  ]);
  assert.deepEqual(first, { payload: "stored", version: stored.computeStartedAt, isRefreshing: true });
  assert.deepEqual(second, first);
  assert.equal(calls.compute, 1);
  finishCompute("computed");
});

test("stored stats: a failed refresh marks the snapshot dirty again and keeps serving it", async () => {
  const { source, calls } = sourceFor(
    "dirty-failing",
    { ...stored, isDirty: true },
    {
      compute: async () => {
        throw new Error("compute failed");
      },
    },
  );
  const read = await readStoredSnapshot(source);
  assert.deepEqual(read, { payload: "stored", version: stored.computeStartedAt, isRefreshing: true });
  assert.equal(calls.markDirty, 1);
  assert.equal(calls.store, 0);
});

test("stored stats: stats are still returned, unstored, when dirty marks cannot be cleared", async () => {
  const { source, calls } = sourceFor("lock-timeout", null, {
    clearDirtyMarks: async () => {
      throw new Error("lock timeout");
    },
  });
  const read = await readStoredSnapshot(source);
  assert.equal(read.payload, "computed");
  assert.equal(calls.store, 0);
});

test("stored stats: only an unfiltered query reads the stored collection snapshot", () => {
  const unfiltered = { search: "", sort: "name", filters: EMPTY_CARD_FILTERS, grouped: true, unreviewed: false };
  assert.equal(isUnfilteredCardsQuery(unfiltered), true);
  assert.equal(isUnfilteredCardsQuery({ ...unfiltered, search: "bolt" }), false);
  assert.equal(isUnfilteredCardsQuery({ ...unfiltered, unreviewed: true }), false);
  assert.equal(
    isUnfilteredCardsQuery({ ...unfiltered, filters: { ...EMPTY_CARD_FILTERS, sets: ["mkm"] } }),
    false,
  );
  assert.equal(
    isUnfilteredCardsQuery({ ...unfiltered, filters: { ...EMPTY_CARD_FILTERS, hideDownloaded: true } }),
    false,
  );
});
