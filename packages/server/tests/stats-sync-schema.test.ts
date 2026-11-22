import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STATS_SYNC_MAX_DAYS_PER_REQUEST,
  STATS_SYNC_MAX_SCANS_PER_DAY,
  statsSyncConnectFormSchema,
  statsSyncPushSchema,
} from "@magic-vault/shared";

const DAY = { day: "2026-11-18", scanCount: 10, matchedCount: 8, unmatchedCount: 2, correctedCount: 1 };

test("accepts consistent daily totals", () => {
  assert.equal(statsSyncPushSchema.safeParse({ days: [DAY] }).success, true);
  assert.equal(statsSyncPushSchema.safeParse({ days: [] }).success, true);
});

test("rejects totals that don't add up", () => {
  assert.equal(statsSyncPushSchema.safeParse({ days: [{ ...DAY, scanCount: 11 }] }).success, false);
  assert.equal(statsSyncPushSchema.safeParse({ days: [{ ...DAY, correctedCount: 11 }] }).success, false);
  assert.equal(statsSyncPushSchema.safeParse({ days: [{ ...DAY, matchedCount: -1, unmatchedCount: 11 }] }).success, false);
});

test("rejects absurd counts, early days, duplicates and oversized batches", () => {
  const huge = STATS_SYNC_MAX_SCANS_PER_DAY + 1;
  assert.equal(
    statsSyncPushSchema.safeParse({ days: [{ ...DAY, scanCount: huge, matchedCount: huge, unmatchedCount: 0 }] }).success,
    false,
  );
  assert.equal(statsSyncPushSchema.safeParse({ days: [{ ...DAY, day: "2023-12-31" }] }).success, false);
  assert.equal(statsSyncPushSchema.safeParse({ days: [{ ...DAY, day: "2026-13-01" }] }).success, false);
  assert.equal(statsSyncPushSchema.safeParse({ days: [DAY, DAY] }).success, false);
  const tooMany = Array.from({ length: STATS_SYNC_MAX_DAYS_PER_REQUEST + 1 }, (_, index) => {
    const day = new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10);
    return { ...DAY, day };
  });
  assert.equal(statsSyncPushSchema.safeParse({ days: tooMany }).success, false);
});

test("connect form needs a whole stats sync key", () => {
  assert.equal(statsSyncConnectFormSchema.safeParse({ syncKey: " mvstats_abc123 " }).success, true);
  assert.equal(statsSyncConnectFormSchema.safeParse({ syncKey: "mvstats_" }).success, false);
  assert.equal(statsSyncConnectFormSchema.safeParse({ syncKey: "mv_abc123" }).success, false);
});
