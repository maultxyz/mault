import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countReviewAutoCheckVerdicts,
  decideReviewAutoCheck,
  loadUnseenReviewCards,
  REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS,
  runReviewAutoCheck,
  type CardSearchResult,
  type CardTextSearchResult,
} from "@magic-vault/shared";

const saved = { cardId: "saved", lang: "en" };

function result(
  ...matches: { cardId: string; distance: number; lang?: string }[]
): CardSearchResult {
  return {
    data: matches.map((match) => ({
      id: match.cardId,
      confidence: 1 - match.distance,
      ...match,
    })),
  } as CardSearchResult;
}

function textResult(
  printingConfirmed: boolean,
  ...matches: { cardId: string; distance: number }[]
): CardTextSearchResult {
  return { ...result(...matches), ocr: { printingConfirmed } } as CardTextSearchResult;
}

test("a confident image match of the saved card is confirmed without text", () => {
  const decision = decideReviewAutoCheck(
    saved,
    result({ cardId: "saved", distance: 0.1 }, { cardId: "other", distance: 0.4 }),
    null,
  );
  assert.equal(decision.verdict, "confirmed");
});

test("an unsure image match is confirmed only when the printed text agrees", () => {
  const unsureImage = result(
    { cardId: "saved", distance: 0.2 },
    { cardId: "other", distance: 0.22 },
  );
  assert.equal(decideReviewAutoCheck(saved, unsureImage, null).verdict, "unsure");
  assert.equal(
    decideReviewAutoCheck(
      saved,
      unsureImage,
      textResult(true, { cardId: "saved", distance: 0.2 }),
    ).verdict,
    "confirmed",
  );
});

test("text that confirms another printing suggests that card", () => {
  const decision = decideReviewAutoCheck(
    saved,
    result({ cardId: "saved", distance: 0.1 }, { cardId: "other", distance: 0.4 }),
    textResult(true, { cardId: "other", distance: 0.12 }),
  );
  assert.equal(decision.verdict, "different");
  assert.equal(decision.suggestion?.cardId, "other");
});

test("the same card id in another language is a different card", () => {
  const decision = decideReviewAutoCheck(
    saved,
    result({ cardId: "saved", distance: 0.1, lang: "de" }),
    null,
  );
  assert.equal(decision.verdict, "different");
});

test("no match at all stays unsure", () => {
  assert.equal(decideReviewAutoCheck(saved, { data: [] }, null).verdict, "unsure");
});

function confirmedResult(scanIds: string[]) {
  return {
    outcomes: scanIds.map((scanId) => ({
      scanId,
      verdict: "confirmed" as const,
      suggestedCardName: null,
    })),
  };
}

test("auto-check runs per collection in request-sized chunks", async () => {
  const cards = [
    ...Array.from({ length: REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS + 1 }, (_, index) => ({
      scanId: `a${index}`,
      collectionGuid: "a",
    })),
    { scanId: "b0", collectionGuid: "b" },
  ];
  const requests: [string, number][] = [];
  const result = await runReviewAutoCheck({
    cards: () => cards,
    sentScanIds: new Set(),
    checkCollectionCards: async (collectionGuid, scanIds) => {
      requests.push([collectionGuid, scanIds.length]);
      return confirmedResult(scanIds);
    },
    onOutcomes: () => {},
  });
  assert.equal(result, "finished");
  assert.deepEqual(requests, [
    ["a", REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS],
    ["a", 1],
    ["b", 1],
  ]);
});

test("auto-check loads more cards until none are left", async () => {
  const cards = [{ scanId: "a0", collectionGuid: "a" }];
  const morePages = [[{ scanId: "a1", collectionGuid: "a" }], []];
  const checked: string[] = [];
  await runReviewAutoCheck({
    cards: () => cards,
    sentScanIds: new Set(),
    loadMoreCards: async () => {
      const page = morePages.shift() ?? [];
      cards.push(...page);
      return page.length;
    },
    checkCollectionCards: async (_collectionGuid, scanIds) => {
      checked.push(...scanIds);
      return confirmedResult(scanIds);
    },
    onOutcomes: () => {},
  });
  assert.deepEqual(checked, ["a0", "a1"]);
});

test("auto-check announces each batch and pauses between batches", async () => {
  const cards = Array.from({ length: REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS * 2 }, (_, index) => ({
    scanId: `a${index}`,
    collectionGuid: "a",
  }));
  const startedBatches: string[][] = [];
  let isPaused = false;
  let appliedCount = 0;
  const result = await runReviewAutoCheck({
    cards: () => cards,
    sentScanIds: new Set(),
    onBatchStart: (scanIds) => startedBatches.push(scanIds),
    checkCollectionCards: async (_collectionGuid, scanIds) => {
      isPaused = true;
      return confirmedResult(scanIds);
    },
    onOutcomes: (outcomes) => {
      appliedCount += outcomes.length;
    },
    isCancelled: () => isPaused,
  });
  assert.equal(result, "cancelled");
  assert.equal(startedBatches.length, 1);
  assert.equal(appliedCount, REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS);
});

test("a failed batch is not counted as sent so a resume retries it", async () => {
  const sentScanIds = new Set<string>();
  await assert.rejects(
    runReviewAutoCheck({
      cards: () => [{ scanId: "a0", collectionGuid: "a" }],
      sentScanIds,
      checkCollectionCards: async () => {
        throw new Error("offline");
      },
      onOutcomes: () => {},
    }),
  );
  assert.equal(sentScanIds.size, 0);
});

test("loading unseen cards scans from the first page and skips seen cards", async () => {
  const pages = [
    [{ scanId: "seen" }],
    [{ scanId: "seen2" }, { scanId: "new" }],
  ];
  const requestedPages: number[] = [];
  const unseen = await loadUnseenReviewCards(async (page) => {
    requestedPages.push(page);
    return pages[page] ?? [];
  }, new Set(["seen", "seen2"]));
  assert.deepEqual(unseen, [{ scanId: "new" }]);
  assert.deepEqual(requestedPages, [0, 1]);
  assert.deepEqual(await loadUnseenReviewCards(async () => [], new Set()), []);
});

test("verdict counts add up per verdict", () => {
  assert.deepEqual(
    countReviewAutoCheckVerdicts([
      { scanId: "1", verdict: "confirmed", suggestedCardName: null },
      { scanId: "2", verdict: "different", suggestedCardName: "X" },
      { scanId: "3", verdict: "confirmed", suggestedCardName: null },
    ]),
    { confirmed: 2, different: 1, unsure: 0 },
  );
});
