import assert from "node:assert/strict";
import { test } from "node:test";
import { waitUntilCardSettles, type CardContour } from "@magic-vault/shared";

const stillContour: CardContour = {
  topLeft: { x: 10, y: 10 },
  topRight: { x: 110, y: 10 },
  bottomRight: { x: 110, y: 150 },
  bottomLeft: { x: 10, y: 150 },
};

test("a card that stays still settles well before the maximum wait", async () => {
  const startedAt = Date.now();
  const settled = await waitUntilCardSettles({
    observeCard: async () => ({ cardPresent: true, contour: stillContour, frameLongSidePx: 640 }),
    maxWaitMs: 2000,
    minimumGapBetweenObservationsMs: 5,
  });
  assert.equal(settled, true);
  assert.ok(Date.now() - startedAt < 500);
});

test("no card or a failing detector falls back to the maximum wait", async () => {
  const noCard = await waitUntilCardSettles({
    observeCard: async () => ({ cardPresent: false, contour: null, frameLongSidePx: 640 }),
    maxWaitMs: 60,
    minimumGapBetweenObservationsMs: 5,
  });
  const failing = await waitUntilCardSettles({
    observeCard: () => Promise.reject(new Error("model unavailable")),
    maxWaitMs: 60,
    minimumGapBetweenObservationsMs: 5,
  });
  const hanging = await waitUntilCardSettles({
    observeCard: () => new Promise(() => {}),
    maxWaitMs: 60,
  });
  assert.deepEqual([noCard, failing, hanging], [false, false, false]);
});
