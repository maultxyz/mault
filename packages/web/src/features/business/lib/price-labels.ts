import type { PriceLabelItem } from "@/lib/interfaces/price-labels";
import {
  PRICE_LABEL_SOURCES,
  type PriceLabelCard,
  type PriceLabelSource,
} from "@magic-vault/shared";

export function buildPriceLabelItems(
  cards: PriceLabelCard[],
  customPrices: Record<string, number>,
): PriceLabelItem[] {
  return cards.map((card) => {
    const customPrice = customPrices[card.scanId];
    const hasCustomPrice = customPrice !== undefined && Number.isFinite(customPrice);
    return {
      card,
      labelPrice: hasCustomPrice ? customPrice : card.sellPrice,
      hasCustomPrice,
    };
  });
}

export function labelPriceFormatter(language: string, currency: string): (price: number) => string {
  const formatter = new Intl.NumberFormat(language, { style: "currency", currency });
  return (price) => formatter.format(price);
}

export function toPriceLabelSource(value: string | null): PriceLabelSource | null {
  return PRICE_LABEL_SOURCES.find((source) => source === value) ?? null;
}
