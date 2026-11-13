import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveScanFoilType,
  type FoilDetection,
  type PlayingCard,
  type ScanFoilTypeInput,
} from "@magic-vault/shared";

const detectedFoil: FoilDetection = { method: "nudge", foilScore: 0.08, isFoilDetected: true };
const notFoil: FoilDetection = { method: "nudge", foilScore: 0.001, isFoilDetected: false };
const card = { id: "a", name: "Card" } as PlayingCard;

function resolve(overrides: Partial<ScanFoilTypeInput>): string | null {
  return resolveScanFoilType({
    card,
    sessionFoilType: null,
    foilDetection: null,
    fallbackFoilTypes: ["Traditional"],
    gameKey: null,
    isNudgeFoilDetectionEnabled: true,
    isFoilStarDetectionEnabled: true,
    ...overrides,
  });
}

test("the scanner's foil setting wins over detection", () => {
  assert.equal(resolve({ sessionFoilType: "Etched", foilDetection: notFoil }), "Etched");
  assert.equal(resolve({}), null);
  assert.equal(resolve({ foilDetection: notFoil }), null);
});

test("foil-only printings keep their finish whatever detection says", () => {
  const foilOnly = { ...card, foilOnlyFoilType: "Holo" } as PlayingCard;
  assert.equal(
    resolve({ card: foilOnly, foilDetection: notFoil, fallbackFoilTypes: ["Holo"] }),
    "Holo",
  );
  assert.equal(
    resolve({
      card: foilOnly,
      fallbackFoilTypes: ["Holo"],
      isNudgeFoilDetectionEnabled: false,
      isFoilStarDetectionEnabled: false,
    }),
    "Holo",
  );
});

test("a detected foil uses the card's finish family, then the game's", () => {
  assert.equal(resolve({ foilDetection: detectedFoil }), "Traditional");
  const reverseOnly = { ...card, foilTypes: ["Reverse Holo"] } as PlayingCard;
  assert.equal(
    resolve({
      card: reverseOnly,
      foilDetection: detectedFoil,
      fallbackFoilTypes: ["Holo", "Reverse Holo"],
    }),
    "Reverse Holo",
  );
});

test("a detected foil in a game without finishes is saved as plain foil", () => {
  assert.equal(resolve({ foilDetection: detectedFoil, fallbackFoilTypes: [] }), "Foil");
});

test("a printed foil star counts as a detected foil", () => {
  assert.equal(resolve({ printedFoilMarker: { marker: "star" } }), "Traditional");
  assert.equal(resolve({ foilDetection: notFoil, printedFoilMarker: { marker: "dot" } }), null);
  assert.equal(
    resolve({ sessionFoilType: "Etched", printedFoilMarker: { marker: "star" } }),
    "Etched",
  );
});

test("the nudge and the printed star each only count while their own setting is on", () => {
  assert.equal(
    resolve({ foilDetection: detectedFoil, isNudgeFoilDetectionEnabled: false }),
    null,
  );
  assert.equal(
    resolve({ printedFoilMarker: { marker: "star" }, isFoilStarDetectionEnabled: false }),
    null,
  );
  assert.equal(
    resolve({
      foilDetection: detectedFoil,
      printedFoilMarker: { marker: "star" },
      isNudgeFoilDetectionEnabled: false,
    }),
    "Traditional",
  );
  assert.equal(
    resolve({
      foilDetection: detectedFoil,
      printedFoilMarker: { marker: "star" },
      isFoilStarDetectionEnabled: false,
    }),
    "Traditional",
  );
  assert.equal(
    resolve({
      sessionFoilType: "Etched",
      isNudgeFoilDetectionEnabled: false,
      isFoilStarDetectionEnabled: false,
    }),
    "Etched",
  );
});

test("a printing that has no foil version is never detected as foil", () => {
  const nonFoilOnly = { ...card, hasNoFoilPrinting: true } as PlayingCard;
  assert.equal(
    resolve({
      card: nonFoilOnly,
      foilDetection: detectedFoil,
      printedFoilMarker: { marker: "star" },
    }),
    null,
  );
});

test("a detected Magic foil is saved as the plain foil, not the first finish in the game's list", () => {
  assert.equal(
    resolve({
      gameKey: "mtg",
      fallbackFoilTypes: ["Evergreen", "Traditional", "Etched"],
      printedFoilMarker: { marker: "star" },
    }),
    "Traditional",
  );
});
