import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardPriceFor,
  conditionFactor,
  DEFAULT_CONDITION_MULTIPLIERS,
  toCardCondition,
  toConditionMultipliers,
  type PlayingCard,
} from "@magic-vault/shared";

const card = { price: 10, priceFoil: 20 } as PlayingCard;

test("condition: NM is the full price and the defaults follow the industry map", () => {
  assert.equal(cardPriceFor(card, false, "tcgplayer", "NM"), 10);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "LP"), 9);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "MP"), 8);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "HP"), 7);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "DMG"), 6);
});

test("condition: applies to the foil price and leaves a missing price null", () => {
  assert.equal(cardPriceFor(card, true, "tcgplayer", "MP"), 16);
  assert.equal(cardPriceFor({} as PlayingCard, false, "tcgplayer", "LP"), null);
});

test("condition: no condition prices like NM", () => {
  assert.equal(cardPriceFor(card, false, "tcgplayer"), 10);
  assert.equal(toCardCondition(undefined), "NM");
  assert.equal(toCardCondition("bogus"), "NM");
});

test("condition: an org's own percentages replace the defaults", () => {
  const multipliers = toConditionMultipliers({ LP: 85, HP: 50 });
  assert.equal(cardPriceFor(card, false, "tcgplayer", "LP", multipliers), 8.5);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "HP", multipliers), 5);
  assert.equal(cardPriceFor(card, false, "tcgplayer", "MP", multipliers), 8);
});

test("condition: NM can't be changed and invalid percentages fall back", () => {
  const multipliers = toConditionMultipliers({ NM: 50, LP: 150, MP: -1, HP: "70" });
  assert.deepEqual(multipliers, DEFAULT_CONDITION_MULTIPLIERS);
  assert.deepEqual(toConditionMultipliers(null), DEFAULT_CONDITION_MULTIPLIERS);
  assert.equal(conditionFactor("DMG", multipliers), 0.6);
});
