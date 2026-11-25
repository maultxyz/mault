import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardTagNameKey,
  cardTagsSetOn,
  setCardTagsRequestSchema,
  withCardTags,
} from "@magic-vault/shared";

test("turning a tag off only resets that tag", () => {
  const card = { isDownloaded: true, reviewed: true, corrected: true, lowConfidenceMatch: false };
  assert.deepEqual(withCardTags(card, ["reviewed"], false), {
    ...card,
    reviewed: false,
    autoReviewed: false,
  });
  assert.deepEqual(cardTagsSetOn(withCardTags(card, ["downloaded", "corrected"], false)), ["reviewed"]);
});

test("turning on reviewed or corrected resolves the review like an accept", () => {
  const card = { reviewed: false, corrected: false, lowConfidenceMatch: true };
  assert.deepEqual(withCardTags(card, ["corrected"], true), {
    reviewed: true,
    autoReviewed: false,
    corrected: true,
    lowConfidenceMatch: false,
  });
  assert.deepEqual(withCardTags(card, ["downloaded"], true), { ...card, isDownloaded: true });
});

test("only an auto-reviewed card shows the auto-reviewed tag name", () => {
  assert.equal(cardTagNameKey("reviewed", { reviewed: true, autoReviewed: true }), "autoReviewed");
  assert.equal(cardTagNameKey("reviewed", { reviewed: true }), "reviewed");
  assert.equal(cardTagNameKey("downloaded", { autoReviewed: true }), "downloaded");
  assert.equal(withCardTags({ reviewed: true, autoReviewed: true }, ["downloaded"], true).autoReviewed, true);
});

test("tag requests need cards, a known tag and an on/off value", () => {
  const scanId = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
  const valid = { scanIds: [scanId], tags: ["downloaded"], enabled: false };
  assert.equal(setCardTagsRequestSchema.safeParse(valid).success, true);
  assert.equal(setCardTagsRequestSchema.safeParse({ ...valid, scanIds: [] }).success, false);
  assert.equal(setCardTagsRequestSchema.safeParse({ ...valid, tags: ["foil"] }).success, false);
  assert.equal(setCardTagsRequestSchema.safeParse({ scanIds: [scanId], tags: ["reviewed"] }).success, false);
});
