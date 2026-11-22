import { DEFAULT_SELL_PRICE_CONFIG, PRICE_MARKUP_PERCENT_MAX, PRICE_MARKUP_PERCENT_MIN } from "./constants/business.constant";
import { PRICE_LABEL_ROUNDING_MODES } from "./constants/price-labels.constant";
import type { CardSellRule, SellPriceConfig } from "./interfaces/business.interface";
import { roundPriceUp } from "./price-labels";

export const EMPTY_CARD_SELL_RULE: CardSellRule = {
  markupPercent: null,
  fixedPrice: null,
  fixedCurrency: null,
};

export function cardSellPrice(
  marketPrice: number | null,
  rule: CardSellRule,
  config: SellPriceConfig,
  currency: string,
): number | null {
  if (rule.fixedPrice != null && rule.fixedCurrency === currency) return rule.fixedPrice;
  if (marketPrice == null || !Number.isFinite(marketPrice)) return null;
  const markupPercent = rule.markupPercent ?? config.defaultMarkupPercent;
  return roundPriceUp(marketPrice * (1 + markupPercent / 100), config.rounding);
}

export function toSellPriceConfig(value: unknown): SellPriceConfig {
  const input =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof SellPriceConfig, unknown>>)
      : {};
  const markup = Number(input.defaultMarkupPercent);
  const rounding = PRICE_LABEL_ROUNDING_MODES.find((mode) => mode === input.rounding);
  return {
    defaultMarkupPercent: Number.isFinite(markup)
      ? Math.min(Math.max(markup, PRICE_MARKUP_PERCENT_MIN), PRICE_MARKUP_PERCENT_MAX)
      : DEFAULT_SELL_PRICE_CONFIG.defaultMarkupPercent,
    rounding: rounding ?? DEFAULT_SELL_PRICE_CONFIG.rounding,
  };
}
