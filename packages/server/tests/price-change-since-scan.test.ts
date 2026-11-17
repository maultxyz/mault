import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardPricesAtScan,
  priceChangeSinceScan,
  type PlayingCard,
} from "@magic-vault/shared";

test("cardPricesAtScan keeps only numeric saved prices", () => {
  const savedCard = {
    price: 1.5,
    priceFoil: null,
    priceEur: 1.2,
    priceCardKingdom: "3",
  } as unknown as PlayingCard;
  assert.deepEqual(cardPricesAtScan(savedCard), { price: 1.5, priceEur: 1.2 });
});

test("priceChangeSinceScan reports rounded percent and direction", () => {
  assert.deepEqual(priceChangeSinceScan(10, 12.5), {
    percentLabel: "+25%",
    direction: "up",
  });
  assert.deepEqual(priceChangeSinceScan(10, 7), {
    percentLabel: "-30%",
    direction: "down",
  });
});

test("priceChangeSinceScan is null without a comparable change", () => {
  assert.equal(priceChangeSinceScan(1.001, 1.004), null);
  assert.equal(priceChangeSinceScan(null, 5), null);
  assert.equal(priceChangeSinceScan(5, null), null);
  assert.equal(priceChangeSinceScan(0, 5), null);
});
