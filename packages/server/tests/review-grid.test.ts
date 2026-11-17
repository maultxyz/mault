import assert from "node:assert/strict";
import { test } from "node:test";
import {
  reviewAcceptKind,
  toReviewGridCard,
  type PlayingCardWithDistance,
  type ReviewGridCard,
} from "@magic-vault/shared";

const card = { id: "card-1", name: "Sol Ring" } as PlayingCardWithDistance;

const gridCard = (overrides: Partial<ReviewGridCard>): ReviewGridCard => ({
  scanId: "scan-1",
  collectionGuid: "collection-1",
  card,
  lowConfidenceMatch: false,
  hasAlternatives: false,
  corrected: false,
  ...overrides,
});

test("review grid: flagged, uncorrected matches are confirmed", () => {
  assert.equal(reviewAcceptKind(gridCard({ lowConfidenceMatch: true })), "confirm");
  assert.equal(reviewAcceptKind(gridCard({ hasAlternatives: true })), "confirm");
});

test("review grid: unflagged or corrected matches are only marked reviewed", () => {
  assert.equal(reviewAcceptKind(gridCard({})), "review");
  assert.equal(
    reviewAcceptKind(gridCard({ lowConfidenceMatch: true, corrected: true })),
    "review",
  );
});

test("review grid: scanned cards map their alternatives to a flag", () => {
  const mapped = toReviewGridCard("collection-1", {
    scanId: "scan-1",
    card,
    alternativeMatches: [card],
  } as Parameters<typeof toReviewGridCard>[1]);
  assert.deepEqual(mapped, gridCard({ hasAlternatives: true }));
});
