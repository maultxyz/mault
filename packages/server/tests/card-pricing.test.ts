import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cardSellPrice,
  DEFAULT_SELL_PRICE_CONFIG,
  EMPTY_CARD_SELL_RULE,
  toSellPriceConfig,
} from "@magic-vault/shared";

describe("cardSellPrice", () => {
  it("uses the market price when nothing is set", () => {
    assert.equal(cardSellPrice(10, EMPTY_CARD_SELL_RULE, DEFAULT_SELL_PRICE_CONFIG, "USD"), 10);
  });

  it("applies the org default margin and rounding", () => {
    const config = { defaultMarkupPercent: 20, rounding: "ninetyNine" as const };
    assert.equal(cardSellPrice(10, EMPTY_CARD_SELL_RULE, config, "USD"), 12.99);
  });

  it("prefers the card margin over the org default", () => {
    const config = { defaultMarkupPercent: 20, rounding: "none" as const };
    const rule = { ...EMPTY_CARD_SELL_RULE, markupPercent: 50 };
    assert.equal(cardSellPrice(10, rule, config, "USD"), 15);
  });

  it("uses a fixed price only in the org currency", () => {
    const rule = { markupPercent: null, fixedPrice: 7.5, fixedCurrency: "USD" };
    assert.equal(cardSellPrice(10, rule, DEFAULT_SELL_PRICE_CONFIG, "USD"), 7.5);
    assert.equal(cardSellPrice(10, rule, DEFAULT_SELL_PRICE_CONFIG, "EUR"), 10);
  });

  it("has no price without a market price or a fixed price", () => {
    assert.equal(cardSellPrice(null, EMPTY_CARD_SELL_RULE, DEFAULT_SELL_PRICE_CONFIG, "USD"), null);
  });
});

describe("toSellPriceConfig", () => {
  it("falls back to defaults and clamps the margin", () => {
    assert.deepEqual(toSellPriceConfig(null), DEFAULT_SELL_PRICE_CONFIG);
    assert.deepEqual(toSellPriceConfig({ defaultMarkupPercent: 5000, rounding: "whole" }), {
      defaultMarkupPercent: 1000,
      rounding: "whole",
    });
  });
});
