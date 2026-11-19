import assert from "node:assert/strict";
import { test } from "node:test";
import { prefersTextMatch, type CardSearchResult } from "@magic-vault/shared";
import { preferClosestNameMissingUnreadWords } from "../src/lib/ocr-name-choice";

interface NameCandidate {
  cardId: string;
  name: string;
  score: number;
  distance: number;
}

const nameOf = (candidate: NameCandidate) => candidate.name;

const energyCandidates: NameCandidate[] = [
  { cardId: "sv03-230", name: "Basic Fire Energy", score: 0.72, distance: 0.42 },
  { cardId: "sve-002", name: "Basic Fire Energy", score: 0.72, distance: 0.38 },
  { cardId: "sve-003", name: "Basic Water Energy", score: 0.68, distance: 0.36 },
  { cardId: "sve-015", name: "Basic Darkness Energy", score: 0.59, distance: 0.08 },
  { cardId: "sve-007", name: "Basic Darkness Energy", score: 0.59, distance: 0.11 },
];

function searchResult(...distances: number[]): CardSearchResult {
  return {
    success: true,
    data: distances.map((distance, index) => ({
      id: `card-${index}`,
      cardId: `card-${index}`,
      distance,
      confidence: 1 - distance,
    })),
  };
}

test("an OCR read missing a word printed as a symbol picks the name closest to the scan", () => {
  const ranked = preferClosestNameMissingUnreadWords(energyCandidates, nameOf, "Basic Energy");
  assert.deepEqual(
    ranked.slice(0, 2).map(({ cardId }) => cardId),
    ["sve-015", "sve-007"],
  );
  assert.equal(ranked.length, energyCandidates.length);
});

test("a read that names a card exactly keeps the text ranking", () => {
  const candidates = [
    { cardId: "exact", name: "Basic Energy", score: 1, distance: 0.5 },
    ...energyCandidates,
  ];
  assert.equal(
    preferClosestNameMissingUnreadWords(candidates, nameOf, "Basic Energy")[0].cardId,
    "exact",
  );
});

test("a read that only fits one longer name keeps the text ranking", () => {
  const candidates = [
    { cardId: "bolt", name: "Lightning Bolt", score: 0.8, distance: 0.6 },
    { cardId: "helix", name: "Lightning Helix", score: 0.6, distance: 0.1 },
  ];
  assert.equal(
    preferClosestNameMissingUnreadWords(candidates, nameOf, "Lightning Bolt")[0].cardId,
    "bolt",
  );
});

test("an unconfirmed text match that looks clearly worse than an unsure image match loses", () => {
  const unsureImageMatch = searchResult(0.08, 0.1);
  assert.equal(
    prefersTextMatch(unsureImageMatch, { printingConfirmed: false }, searchResult(0.42)),
    false,
  );
  assert.equal(
    prefersTextMatch(unsureImageMatch, { printingConfirmed: false }, searchResult(0.12)),
    true,
  );
});

test("a confirmed printing or a missing image match still lets text win", () => {
  assert.equal(
    prefersTextMatch(searchResult(0.08, 0.1), { printingConfirmed: true }, searchResult(0.42)),
    true,
  );
  assert.equal(
    prefersTextMatch(
      { success: true, data: [], diagnostics: { reason: "too_far" } } as CardSearchResult,
      { printingConfirmed: false },
      searchResult(0.42),
    ),
    true,
  );
});

test("a confident image match is never replaced by an unconfirmed text match", () => {
  assert.equal(
    prefersTextMatch(searchResult(0.08, 0.3), { printingConfirmed: false }, searchResult(0.09)),
    false,
  );
});
