import assert from "node:assert/strict";
import test from "node:test";
import { qualifiesForValueCelebration } from "../../shared/src/lighting";
import { cardPriceFor } from "../../shared/src/price-source";
import type { PlayingCard } from "../../shared/src/interfaces/card.interface";
import type { ValueCelebrationSettings } from "../../shared/src/interfaces/lighting.interface";

const settings: ValueCelebrationSettings = {
  valueCelebrationEnabled: true,
  valueCelebrationThreshold: 10,
  valueCelebrationPriceSource: "tcgplayer",
  valueCelebrationDurationMs: 500,
};

test("celebration uses an inclusive threshold", () => {
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", 9.99), false);
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", 10), true);
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", 10.01), true);
});

test("disabled settings and a different price source never celebrate", () => {
  assert.equal(qualifiesForValueCelebration({ ...settings, valueCelebrationEnabled: false }, "tcgplayer", 100), false);
  assert.equal(qualifiesForValueCelebration(settings, "cardmarket", 100), false);
});

test("unknown and invalid prices do not celebrate, including with zero threshold", () => {
  const zero = { ...settings, valueCelebrationThreshold: 0 };
  for (const price of [null, NaN, Infinity, -1]) {
    assert.equal(qualifiesForValueCelebration(zero, "tcgplayer", price), false);
  }
  assert.equal(qualifiesForValueCelebration(zero, "tcgplayer", 0), true);
  assert.equal(qualifiesForValueCelebration({ ...settings, valueCelebrationThreshold: NaN }, "tcgplayer", 100), false);
});

test("celebration uses the shared foil-aware price calculation", () => {
  const card: PlayingCard = {
    id: "test", name: "Test", image: null, set: "test", setName: "Test",
    collectorNumber: "1", rarity: "common", typeLine: "", colorIdentity: [],
    price: 8, priceFoil: 12,
  };
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", cardPriceFor(card, false, "tcgplayer")), false);
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", cardPriceFor(card, true, "tcgplayer")), true);
  assert.equal(qualifiesForValueCelebration(settings, "tcgplayer", cardPriceFor(card, true, "tcgplayer", "DMG")), false);
});
