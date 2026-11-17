import assert from "node:assert/strict";
import { test } from "node:test";
import { isSnapshotDue } from "../src/lib/snapshot-schedule";

const fifteenMinutesMs = 15 * 60 * 1000;

test("a snapshot is due when none was written yet", () => {
  assert.equal(isSnapshotDue(undefined, Date.parse("2026-11-16T12:00:00Z"), fifteenMinutesMs), true);
});

test("a snapshot is throttled within the interval on the same day", () => {
  const lastSnapshotAt = Date.parse("2026-11-16T12:00:00Z");
  assert.equal(isSnapshotDue(lastSnapshotAt, lastSnapshotAt + fifteenMinutesMs - 1, fifteenMinutesMs), false);
  assert.equal(isSnapshotDue(lastSnapshotAt, lastSnapshotAt + fifteenMinutesMs, fifteenMinutesMs), true);
});

test("a new UTC day makes a snapshot due even within the interval", () => {
  const lastSnapshotAt = Date.parse("2026-11-16T23:59:00Z");
  assert.equal(isSnapshotDue(lastSnapshotAt, Date.parse("2026-11-17T00:01:00Z"), fifteenMinutesMs), true);
});
