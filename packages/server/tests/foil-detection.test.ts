import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveScanFoilType, type FoilDetection, type PlayingCard } from "@magic-vault/shared";

const detectedFoil: FoilDetection = { method: "nudge", foilScore: 0.08, isFoilDetected: true };
const notFoil: FoilDetection = { method: "nudge", foilScore: 0.001, isFoilDetected: false };
const card = { id: "a", name: "Card" } as PlayingCard;

test("the scanner's foil setting wins over detection", () => {
  assert.equal(resolveScanFoilType(card, "Etched", notFoil, ["Traditional"]), "Etched");
  assert.equal(resolveScanFoilType(card, null, null, ["Traditional"]), null);
  assert.equal(resolveScanFoilType(card, null, notFoil, ["Traditional"]), null);
});

test("foil-only printings keep their finish whatever detection says", () => {
  const foilOnly = { ...card, foilOnlyFoilType: "Holo" } as PlayingCard;
  assert.equal(resolveScanFoilType(foilOnly, null, notFoil, ["Holo"]), "Holo");
});

test("a detected foil uses the card's finish family, then the game's", () => {
  assert.equal(resolveScanFoilType(card, null, detectedFoil, ["Traditional"]), "Traditional");
  const reverseOnly = { ...card, foilTypes: ["Reverse Holo"] } as PlayingCard;
  assert.equal(
    resolveScanFoilType(reverseOnly, null, detectedFoil, ["Holo", "Reverse Holo"]),
    "Reverse Holo",
  );
});

test("a detected foil in a game without finishes is saved as plain foil", () => {
  assert.equal(resolveScanFoilType(card, null, detectedFoil, []), "Foil");
});
