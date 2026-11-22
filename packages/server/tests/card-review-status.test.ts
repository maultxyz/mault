import assert from "node:assert/strict";
import { test } from "node:test";
import { cardReviewStatus } from "@magic-vault/shared";

test("flagged cards need attention until corrected or reviewed", () => {
  assert.equal(cardReviewStatus({ lowConfidenceMatch: true }), "needsAttention");
  assert.equal(cardReviewStatus({ hasAlternatives: true }), "needsAttention");
  assert.equal(cardReviewStatus({ lowConfidenceMatch: true, isReviewed: true }), "reviewed");
  assert.equal(cardReviewStatus({ hasAlternatives: true, wasCorrected: true }), "reviewed");
});

test("unflagged cards show only once reviewed", () => {
  assert.equal(cardReviewStatus({}), null);
  assert.equal(cardReviewStatus({ wasCorrected: true }), null);
  assert.equal(cardReviewStatus({ isReviewed: true }), "reviewed");
});
