import assert from "node:assert/strict";
import { test } from "node:test";
import { priceLabelPrice } from "@magic-vault/shared";

test("keeps the market price without markup or rounding", () => {
  assert.equal(priceLabelPrice(3.37, { markupPercent: 0, rounding: "none" }), 3.37);
});

test("applies markup before rounding up", () => {
  assert.equal(priceLabelPrice(10, { markupPercent: 10, rounding: "none" }), 11);
  assert.equal(priceLabelPrice(10, { markupPercent: -25, rounding: "none" }), 7.5);
  assert.equal(priceLabelPrice(1.01, { markupPercent: 0, rounding: "quarter" }), 1.25);
  assert.equal(priceLabelPrice(1.25, { markupPercent: 0, rounding: "quarter" }), 1.25);
  assert.equal(priceLabelPrice(2.01, { markupPercent: 0, rounding: "whole" }), 3);
  assert.equal(priceLabelPrice(2, { markupPercent: 0, rounding: "whole" }), 2);
});

test("rounds up to the next .99", () => {
  assert.equal(priceLabelPrice(2.99, { markupPercent: 0, rounding: "ninetyNine" }), 2.99);
  assert.equal(priceLabelPrice(3, { markupPercent: 0, rounding: "ninetyNine" }), 3.99);
  assert.equal(priceLabelPrice(0.1, { markupPercent: 0, rounding: "ninetyNine" }), 0.99);
});

test("has no price without a market price and never goes negative", () => {
  assert.equal(priceLabelPrice(null, { markupPercent: 50, rounding: "whole" }), null);
  assert.equal(priceLabelPrice(4, { markupPercent: -100, rounding: "ninetyNine" }), 0);
});
