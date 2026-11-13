import assert from "node:assert/strict";
import { test } from "node:test";
import {
  reviewGridAttributesOf,
  reviewGridAttributeUpdate,
  type ReviewGridCard,
} from "@magic-vault/shared";

const gridCard = (overrides: Partial<ReviewGridCard> = {}): ReviewGridCard =>
  ({
    scanId: "scan-1",
    collectionGuid: "collection-1",
    card: { lang: "en" },
    lowConfidenceMatch: false,
    hasAlternatives: false,
    corrected: false,
    isFoil: false,
    foilType: null,
    stamp: null,
    condition: "NM",
    language: null,
    ...overrides,
  }) as ReviewGridCard;

test("a foil scan without a saved finish reads as the default foil type", () => {
  const attributes = reviewGridAttributesOf(gridCard({ isFoil: true }), "Foil");
  assert.deepEqual(attributes, { foilType: "Foil", stamp: null, condition: "NM", language: "en" });
});

test("an untouched tile saves nothing on accept", () => {
  const saved = reviewGridAttributesOf(gridCard(), "Foil");
  assert.equal(reviewGridAttributeUpdate(saved, undefined), null);
  assert.equal(reviewGridAttributeUpdate(saved, { ...saved }), null);
});

test("changing condition sends finish and condition but leaves stamp and language alone", () => {
  const saved = reviewGridAttributesOf(gridCard(), "Foil");
  assert.deepEqual(reviewGridAttributeUpdate(saved, { ...saved, condition: "LP" }), {
    isFoil: false,
    foilType: null,
    condition: "LP",
  });
});

test("changing foil and language sends both, and clearing foil sends isFoil false", () => {
  const saved = reviewGridAttributesOf(gridCard({ isFoil: true, foilType: "Etched" }), "Foil");
  assert.deepEqual(reviewGridAttributeUpdate(saved, { ...saved, foilType: null, language: "ja" }), {
    isFoil: false,
    foilType: null,
    condition: "NM",
    language: "ja",
  });
});
