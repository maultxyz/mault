import assert from "node:assert/strict";
import { test } from "node:test";
import { roundPriceUp } from "@magic-vault/shared";

test("roundPriceUp keeps exact cents without rounding", () => {
  assert.equal(roundPriceUp(3.37, "none"), 3.37);
});

test("roundPriceUp rounds up to quarters and whole units", () => {
  assert.equal(roundPriceUp(1.01, "quarter"), 1.25);
  assert.equal(roundPriceUp(1.25, "quarter"), 1.25);
  assert.equal(roundPriceUp(2.01, "whole"), 3);
  assert.equal(roundPriceUp(2, "whole"), 2);
});

test("roundPriceUp ends on .99", () => {
  assert.equal(roundPriceUp(2.99, "ninetyNine"), 2.99);
  assert.equal(roundPriceUp(3, "ninetyNine"), 3.99);
  assert.equal(roundPriceUp(0.1, "ninetyNine"), 0.99);
});

test("roundPriceUp never goes below zero", () => {
  assert.equal(roundPriceUp(-4, "ninetyNine"), 0);
});
