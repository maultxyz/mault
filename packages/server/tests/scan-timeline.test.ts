import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupCardsByScanTime,
  isScanTimelineGrouping,
  scanTimelineBucketKey,
  scanTimelineBucketStart,
} from "@magic-vault/shared";

function localTime(month: number, day: number, hour: number, minute = 0): number {
  return new Date(2026, month - 1, day, hour, minute).getTime();
}

test("bucket keys use the local day or hour", () => {
  assert.equal(scanTimelineBucketKey(localTime(11, 9, 15, 42), "day"), "2026-11-09");
  assert.equal(scanTimelineBucketKey(localTime(11, 9, 15, 42), "hour"), "2026-11-09T15");
  assert.equal(scanTimelineBucketKey(localTime(1, 3, 4), "hour"), "2026-01-03T04");
});

test("bucket start parses back to the local start of the bucket", () => {
  assert.equal(scanTimelineBucketStart("2026-11-09").getTime(), localTime(11, 9, 0));
  assert.equal(scanTimelineBucketStart("2026-11-09T15").getTime(), localTime(11, 9, 15));
});

test("cards newest first group into consecutive blocks with server counts", () => {
  const cards = [
    { scanId: "a", scannedAt: localTime(11, 9, 15, 50) },
    { scanId: "b", scannedAt: localTime(11, 9, 15, 10) },
    { scanId: "c", scannedAt: localTime(11, 9, 9, 0) },
    { scanId: "d", scannedAt: localTime(11, 8, 23, 59) },
  ];

  const byDay = groupCardsByScanTime(cards, "day", [
    { bucketKey: "2026-11-09", cardCount: 3 },
    { bucketKey: "2026-11-08", cardCount: 140 },
  ]);
  assert.deepEqual(
    byDay.map((block) => [block.bucketKey, block.cardCount, block.cards.map((card) => card.scanId)]),
    [
      ["2026-11-09", 3, ["a", "b", "c"]],
      ["2026-11-08", 140, ["d"]],
    ],
  );

  const byHour = groupCardsByScanTime(cards, "hour");
  assert.deepEqual(
    byHour.map((block) => [block.bucketKey, block.cardCount]),
    [
      ["2026-11-09T15", 2],
      ["2026-11-09T09", 1],
      ["2026-11-08T23", 1],
    ],
  );
});

test("only day and hour are timeline groupings", () => {
  assert.ok(isScanTimelineGrouping("day"));
  assert.ok(isScanTimelineGrouping("hour"));
  assert.ok(!isScanTimelineGrouping("off"));
  assert.ok(!isScanTimelineGrouping(null));
});
