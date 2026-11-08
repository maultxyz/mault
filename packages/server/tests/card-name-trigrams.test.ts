import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardsWithSimilarName,
  nameSimilarity,
} from "../src/lib/card-name-trigrams";
import { buildCardMatchSegment } from "../src/lib/card-match-search";

test("name similarity matches pg_trgm similarity()", () => {
  assert.equal(nameSimilarity("word", "word"), 1);
  assert.ok(Math.abs(nameSimilarity("word", "two words") - 0.36363637) < 1e-6);
  assert.equal(nameSimilarity("Fire // Ice", "fire ice"), 1);
  assert.equal(nameSimilarity("", "Lightning Bolt"), 0);
});

test("similar names return every printing above the threshold", () => {
  const embedding = new Float32Array(128).fill(1);
  const row = (cardId: string, name: string) => ({
    cardId,
    name,
    setCode: "set",
    collectorNumber: null,
    rarePrinting: false,
    embedding,
    backEmbedding: null,
  });
  const segment = buildCardMatchSegment("mtg", "en", [
    row("a", "Lightning Bolt"),
    row("b", "Lightning Bolt"),
    row("c", "Counterspell"),
  ]);
  const matches = cardsWithSimilarName([segment], "Lightnig Bolt", 0.45);
  assert.deepEqual(
    matches.map((match) => segment.cardIds[match.row]).sort(),
    ["a", "b"],
  );
});
