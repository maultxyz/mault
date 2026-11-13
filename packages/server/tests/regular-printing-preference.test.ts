import assert from "node:assert/strict";
import { test } from "node:test";
import {
  regularPrintingAmongMatches,
  compareTextRankedPrintings,
  readsLetteredCollectorNumber,
} from "../src/lib/card-search/regular-printing-preference";
import type {
  CardMatchCandidate,
  TextRankedPrintingEvidence,
} from "../src/lib/interfaces/card-search";

function candidate(overrides: Partial<CardMatchCandidate>): CardMatchCandidate {
  return {
    cardId: "regular",
    lang: "en",
    name: "Plains",
    setCode: "hob",
    rarePrinting: false,
    distance: 0.2,
    leaderDistance: 0.1,
    ...overrides,
  };
}

test("a promo leader always gives way to a same-name regular printing, however much closer it is", () => {
  const promo = candidate({ cardId: "promo", setCode: "phob", rarePrinting: true, distance: 0.05, leaderDistance: 0 });
  const otherPromo = candidate({ cardId: "promo-2", rarePrinting: true, distance: 0.1 });
  const regular = candidate({ distance: 0.35, leaderDistance: 0.3 });
  assert.equal(regularPrintingAmongMatches([promo, otherPromo, regular])?.cardId, "regular");
});

test("a regular printing of another card never replaces the leader", () => {
  const promo = candidate({ cardId: "promo", rarePrinting: true, distance: 0.2, leaderDistance: 0 });
  const otherCard = candidate({ name: "Island", distance: 0.21 });
  assert.equal(regularPrintingAmongMatches([promo, otherCard]), undefined);
});

test("a regular leader is kept", () => {
  assert.equal(
    regularPrintingAmongMatches([candidate({}), candidate({ cardId: "promo", rarePrinting: true })]),
    undefined,
  );
});

test("a lettered collector number counts only when read with its letter", () => {
  assert.equal(readsLetteredCollectorNumber("123p", "0123 P HOB EN"), true);
  assert.equal(readsLetteredCollectorNumber("123p", "C 0123p"), true);
  assert.equal(readsLetteredCollectorNumber("123p", "C 0123 HOB EN"), false);
  assert.equal(readsLetteredCollectorNumber("123", "C 0123"), false);
  assert.equal(readsLetteredCollectorNumber(null, "C 0123"), false);
});

function evidence(overrides: Partial<TextRankedPrintingEvidence>): TextRankedPrintingEvidence {
  return {
    isPreferredSet: false,
    matchesPrintedPromo: true,
    setLineMatch: false,
    letteredNumberMatch: false,
    numberMatch: false,
    setTotalMatch: false,
    rarePrinting: false,
    distance: 0.2,
    ...overrides,
  };
}

test("with the same text evidence, OCR prefers the regular printing over a closer promo", () => {
  const promo = evidence({ rarePrinting: true, numberMatch: true, distance: 0.15 });
  const regular = evidence({ numberMatch: true, distance: 0.25 });
  assert.deepEqual([promo, regular].sort(compareTextRankedPrintings), [regular, promo]);
});

test("a promo the collector line points to wins over the regular printing", () => {
  const promoByNumber = evidence({ rarePrinting: true, numberMatch: true });
  const regular = evidence({ distance: 0.1 });
  assert.deepEqual([regular, promoByNumber].sort(compareTextRankedPrintings), [promoByNumber, regular]);

  const promoByLetter = evidence({ rarePrinting: true, numberMatch: true, letteredNumberMatch: true });
  const regularSameNumber = evidence({ numberMatch: true, distance: 0.1 });
  assert.deepEqual(
    [regularSameNumber, promoByLetter].sort(compareTextRankedPrintings),
    [promoByLetter, regularSameNumber],
  );
});
