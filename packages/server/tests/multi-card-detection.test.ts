import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardQuadAspect,
  isCompleteCardInWindow,
  mergeCardCandidates,
  multiCardProposalWindows,
  multiCardRefineWindow,
  offsetContour,
  type CardContour,
} from "@magic-vault/shared";

function cardAt(x: number, y: number, width = 63, height = 88): CardContour {
  return {
    topLeft: { x, y },
    topRight: { x: x + width, y },
    bottomRight: { x: x + width, y: y + height },
    bottomLeft: { x, y: y + height },
  };
}

test("proposal windows cover the whole frame at every scale", () => {
  const windows = multiCardProposalWindows(2000, 1500);
  assert.ok(windows.length > 10);
  for (const window of windows) {
    assert.ok(window.x >= 0 && window.y >= 0);
    assert.ok(window.x + window.width <= 2000);
    assert.ok(window.y + window.height <= 1500);
  }
  const reachesRight = windows.some((window) => window.x + window.width === 2000);
  const reachesBottom = windows.some((window) => window.y + window.height === 1500);
  assert.ok(reachesRight && reachesBottom);
});

test("card aspect is short side over long side in either orientation", () => {
  assert.ok(Math.abs(cardQuadAspect(cardAt(0, 0)) - 63 / 88) < 0.001);
  assert.ok(Math.abs(cardQuadAspect(cardAt(0, 0, 88, 63)) - 63 / 88) < 0.001);
});

test("a card cut off by the window edge is rejected", () => {
  assert.equal(isCompleteCardInWindow(cardAt(20, 20), 120, 140), true);
  assert.equal(isCompleteCardInWindow(cardAt(0, 20), 120, 140), false);
  assert.equal(isCompleteCardInWindow(cardAt(20, 20, 100, 30), 140, 140), false);
  assert.equal(isCompleteCardInWindow(cardAt(20, 20, 6, 8), 400, 400), false);
});

test("overlapping detections of the same card merge, keeping the most confident", () => {
  const merged = mergeCardCandidates([
    { contour: cardAt(100, 100), confidence: 0.6 },
    { contour: cardAt(104, 98), confidence: 0.9 },
    { contour: cardAt(400, 100), confidence: 0.8 },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].confidence, 0.9);
});

test("merged cards come back in reading order", () => {
  const merged = mergeCardCandidates([
    { contour: cardAt(300, 300), confidence: 0.9 },
    { contour: cardAt(100, 305), confidence: 0.9 },
    { contour: cardAt(300, 100), confidence: 0.9 },
    { contour: cardAt(100, 95), confidence: 0.9 },
  ]);
  assert.deepEqual(
    merged.map((candidate) => [candidate.contour.topLeft.x, Math.round(candidate.contour.topLeft.y / 100)]),
    [
      [100, 1],
      [300, 1],
      [100, 3],
      [300, 3],
    ],
  );
});

test("refine window pads the card and stays inside the frame", () => {
  const window = multiCardRefineWindow(cardAt(5, 10), 200, 200);
  assert.equal(window.x, 0);
  assert.ok(window.y < 10);
  assert.ok(window.width > 63 && window.height > 88);
  const shifted = offsetContour(cardAt(0, 0), { x: 10, y: 20 });
  assert.deepEqual(shifted.topLeft, { x: 10, y: 20 });
});
