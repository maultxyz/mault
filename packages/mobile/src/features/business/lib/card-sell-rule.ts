import type { CardPricing, SellPriceFormValues, SellPriceMode } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function cardSellRuleMode(pricing: CardPricing): SellPriceMode {
  if (pricing.sellRule.fixedPrice != null && pricing.sellRule.fixedCurrency === pricing.currency) return "fixed";
  return pricing.sellRule.markupPercent != null ? "markup" : "default";
}

export function signedPercentText(percent: number): string {
  return percent > 0 ? `+${percent}` : String(percent);
}

export function cardSellRuleLabel(pricing: CardPricing, t: TFunction): string {
  const mode = cardSellRuleMode(pricing);
  if (mode === "fixed") return t("cardDetail.pricing.rules.fixed");
  if (mode === "markup") {
    return t("cardDetail.pricing.rules.markup", { percent: signedPercentText(pricing.sellRule.markupPercent ?? 0) });
  }
  return t("cardDetail.pricing.rules.default", { percent: signedPercentText(pricing.defaultMarkupPercent) });
}

export function sellPriceFormValuesOf(pricing: CardPricing): SellPriceFormValues {
  return {
    mode: cardSellRuleMode(pricing),
    markupPercent: pricing.sellRule.markupPercent ?? pricing.defaultMarkupPercent,
    fixedPrice: pricing.sellRule.fixedPrice ?? pricing.sellPrice ?? 0,
  };
}
