import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pickUnmatchedRetryMatch,
  removeUnmatchedScans,
  runUnmatchedRetry,
  UNMATCHED_RETRY_REQUEST_MAX_SCANS,
  type CardSearchResult,
} from "@magic-vault/shared";
import { parseUnmatchedRetryScanIds } from "../src/lib/unmatched-retry";

const match = (cardId: string, distance: number) => ({
  id: cardId,
  cardId,
  distance,
  confidence: 1 - distance,
});

const noImageMatch: CardSearchResult = {
  success: true,
  message: "",
  data: [],
  nearestDistance: 0.9,
  diagnostics: { reason: "too_far" },
} as unknown as CardSearchResult;

test("a text match rescues an image search that found nothing close", () => {
  const text = {
    success: true,
    message: "",
    data: [match("text-card", 0.6)],
    nearestDistance: 0.6,
    ocr: { printingConfirmed: false },
  } as unknown as CardSearchResult & { ocr: { printingConfirmed: boolean } };
  assert.equal(pickUnmatchedRetryMatch(noImageMatch, text), "text");
});

test("without a text read an image match is kept and no match stays unmatched", () => {
  const image = {
    success: true,
    message: "",
    data: [match("image-card", 0.2)],
    nearestDistance: 0.2,
  } as unknown as CardSearchResult;
  assert.equal(pickUnmatchedRetryMatch(image, null), "image");
  assert.equal(pickUnmatchedRetryMatch(noImageMatch, null), null);
});

const scanIdsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => `scan-${index}`);

test("the retry loop sends the selected scans in capped batches and adds them up", async () => {
  const sentBatches: string[][] = [];
  const summary = await runUnmatchedRetry({
    scanIds: [...scanIdsOf(10), "scan-0"],
    retryBatch: async (scanIds) => {
      sentBatches.push(scanIds);
      return { checkedCount: scanIds.length, matchedCount: 1, scanLimitReached: false };
    },
  });
  assert.deepEqual(
    sentBatches.map((batch) => batch.length),
    [UNMATCHED_RETRY_REQUEST_MAX_SCANS, 10 - UNMATCHED_RETRY_REQUEST_MAX_SCANS],
  );
  assert.deepEqual(summary, {
    checkedCount: 10,
    matchedCount: 2,
    totalCount: 10,
    scanLimitReached: false,
    wasStopped: false,
  });
});

test("the retry loop stops on the scan limit and when asked to stop", async () => {
  let limitedCalls = 0;
  const limited = await runUnmatchedRetry({
    scanIds: scanIdsOf(20),
    retryBatch: async (scanIds) => {
      limitedCalls += 1;
      return { checkedCount: scanIds.length, matchedCount: 2, scanLimitReached: true };
    },
  });
  assert.equal(limitedCalls, 1);
  assert.equal(limited.scanLimitReached, true);

  let calls = 0;
  const stopped = await runUnmatchedRetry({
    scanIds: scanIdsOf(20),
    retryBatch: async (scanIds) => {
      calls += 1;
      return { checkedCount: scanIds.length, matchedCount: 0, scanLimitReached: false };
    },
    shouldStop: () => calls >= 1,
  });
  assert.equal(calls, 1);
  assert.equal(stopped.wasStopped, true);
});

test("bulk remove counts removed and failed scans", async () => {
  const summary = await removeUnmatchedScans({
    scanIds: scanIdsOf(6),
    removeScan: async (scanId) => {
      if (scanId === "scan-2") throw new Error("offline");
      return scanId !== "scan-4";
    },
  });
  assert.deepEqual(summary, { removedCount: 4, failedCount: 2 });
});

test("the retry route only accepts a small list of scan ids", () => {
  const scanId = "3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";
  assert.deepEqual(parseUnmatchedRetryScanIds([scanId, scanId]), [scanId]);
  assert.equal(parseUnmatchedRetryScanIds(undefined), null);
  assert.equal(parseUnmatchedRetryScanIds([]), null);
  assert.equal(parseUnmatchedRetryScanIds(["not-a-uuid"]), null);
  assert.equal(
    parseUnmatchedRetryScanIds(
      Array.from({ length: UNMATCHED_RETRY_REQUEST_MAX_SCANS + 1 }, (_, index) =>
        `3f2b8c1e-4a5d-4e6f-8a7b-${String(index).padStart(12, "0")}`,
      ),
    ),
    null,
  );
});
