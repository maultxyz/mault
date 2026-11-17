import assert from "node:assert/strict";
import { test } from "node:test";
import { feederTestBottomBinRoute, runFeederTest } from "@magic-vault/shared";

function fakeRun(feedReplies: (Record<string, unknown> | null)[], routeReplies: unknown[] = []) {
  let feeds = 0;
  let routes = 0;
  let prepares = 0;
  const sentCounts: number[] = [];
  return {
    calls: () => ({ feeds, routes, prepares, sentCounts }),
    options: {
      currentFeedRetryCount: () => 0,
      prepareNextCard: async () => {
        prepares++;
      },
      feedOnce: async () => feedReplies[Math.min(feeds++, feedReplies.length - 1)],
      routeCardToBottomBin: async () => routeReplies[routes++] ?? { status: "routed" },
      isStopRequested: () => false,
      onCardSent: (cardsSent: number) => {
        sentCounts.push(cardsSent);
      },
    },
  };
}

const delivered = { status: "ok", detected: true, empty: false };

test("the feeder test routes to the last module's bottom output", () => {
  assert.deepEqual(feederTestBottomBinRoute(3), { binNumber: 7, module: 3, direction: "bottom" });
});

test("an exact count feeds and routes that many cards", async () => {
  const run = fakeRun([delivered]);
  const result = await runFeederTest({ ...run.options, cardsToSend: 10 });
  assert.deepEqual(result, { outcome: "completed", cardsSent: 10, error: null });
  assert.equal(run.calls().routes, 10);
  assert.equal(run.calls().prepares, 10);
  assert.deepEqual(run.calls().sentCounts, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("running until stopped ends when the hopper is empty", async () => {
  const run = fakeRun([delivered, delivered, { error: "empty: feeder hopper is out of cards", empty: true }]);
  const result = await runFeederTest({ ...run.options, cardsToSend: null });
  assert.deepEqual(result, { outcome: "hopperEmpty", cardsSent: 2, error: null });
});

test("a stop request ends the run before the next card", async () => {
  const run = fakeRun([delivered]);
  let stopRequested = false;
  const result = await runFeederTest({
    ...run.options,
    cardsToSend: null,
    onCardSent: (cardsSent) => {
      if (cardsSent === 3) stopRequested = true;
    },
    isStopRequested: () => stopRequested,
  });
  assert.deepEqual(result, { outcome: "stopped", cardsSent: 3, error: null });
});

test("feed timeouts are retried before the run fails", async () => {
  const timeout = { error: "timeout: feeder did not deliver card to module 1", empty: false };
  const retried = fakeRun([timeout, delivered]);
  const recovered = await runFeederTest({ ...retried.options, currentFeedRetryCount: () => 1, cardsToSend: 1 });
  assert.equal(recovered.outcome, "completed");

  const failing = fakeRun([timeout]);
  const failed = await runFeederTest({ ...failing.options, currentFeedRetryCount: () => 1, cardsToSend: 5 });
  assert.deepEqual(failed, { outcome: "feedFailed", cardsSent: 0, error: timeout.error });
  assert.equal(failing.calls().feeds, 2);
  assert.equal(failing.calls().routes, 0);
});

test("a failed route or a missing reply stops the run", async () => {
  const jammed = fakeRun([delivered], [{ status: "routed" }, { error: "timeout: no card detected at module 2" }]);
  assert.deepEqual(await runFeederTest({ ...jammed.options, cardsToSend: 5 }), {
    outcome: "routeFailed",
    cardsSent: 1,
    error: "timeout: no card detected at module 2",
  });

  const silent = fakeRun([null]);
  assert.deepEqual(await runFeederTest({ ...silent.options, cardsToSend: 5 }), {
    outcome: "feedFailed",
    cardsSent: 0,
    error: null,
  });
});
