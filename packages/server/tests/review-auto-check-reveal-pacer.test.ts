import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD,
  ReviewAutoCheckRevealPacer,
  type ReviewAutoCheckOutcome,
} from "@magic-vault/shared";

function confirmed(scanId: string): ReviewAutoCheckOutcome {
  return { scanId, verdict: "confirmed", suggestedCardName: null };
}

function createFakeClock() {
  let currentMs = 0;
  const timers: { dueAt: number; callback: () => void; id: number }[] = [];
  let nextTimerId = 1;
  return {
    now: () => currentMs,
    setTimer: (callback: () => void, delayMs: number) => {
      const id = nextTimerId++;
      timers.push({ dueAt: currentMs + delayMs, callback, id });
      return id;
    },
    clearTimer: (timerId: unknown) => {
      const index = timers.findIndex((timer) => timer.id === timerId);
      if (index !== -1) timers.splice(index, 1);
    },
    advanceBy(ms: number) {
      const targetMs = currentMs + ms;
      for (;;) {
        timers.sort((first, second) => first.dueAt - second.dueAt);
        const next = timers[0];
        if (!next || next.dueAt > targetMs) break;
        timers.shift();
        currentMs = next.dueAt;
        next.callback();
      }
      currentMs = targetMs;
    },
  };
}

function createPacer() {
  const clock = createFakeClock();
  const revealed: string[] = [];
  const checking: (string | null)[] = [];
  const pacer = new ReviewAutoCheckRevealPacer({
    onReveal: (outcome) => revealed.push(outcome.scanId),
    onCheckingScanIdChange: (scanId) => checking.push(scanId),
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { clock, revealed, checking, pacer };
}

test("checks one card at a time and spreads a batch's results over the request time", () => {
  const { clock, revealed, checking, pacer } = createPacer();
  pacer.addBatch(["a", "b", "c", "d"]);
  assert.deepEqual(checking, ["a"]);
  clock.advanceBy(4000);
  pacer.addOutcomes(["a", "b", "c", "d"].map(confirmed));
  pacer.addBatch(["e", "f"]);
  clock.advanceBy(0);
  assert.deepEqual(revealed, ["a"]);
  clock.advanceBy(900);
  assert.deepEqual(revealed, ["a", "b"]);
  clock.advanceBy(2000);
  assert.deepEqual(revealed, ["a", "b", "c", "d"]);
  assert.equal(checking.at(-1), "e");
});

test("drain reveals the rest quickly and resolves once every result is shown", async () => {
  const { clock, revealed, pacer } = createPacer();
  pacer.addBatch(["a", "b", "c"]);
  clock.advanceBy(3000);
  pacer.addOutcomes(["a", "b", "c"].map(confirmed));
  const drained = pacer.drain();
  clock.advanceBy(REVIEW_AUTO_CHECK_REVEAL_MIN_MS_PER_CARD * 3);
  await drained;
  assert.deepEqual(revealed, ["a", "b", "c"]);
});

test("flush shows every arrived result at once and drops cards the server never answered", () => {
  const { clock, revealed, checking, pacer } = createPacer();
  pacer.addBatch(["a", "b", "c"]);
  clock.advanceBy(1000);
  pacer.addOutcomes([confirmed("a"), confirmed("c")]);
  pacer.flush();
  assert.deepEqual(revealed, ["a", "c"]);
  assert.equal(checking.at(-1), null);
});
