import type { CardPriceSortCurrency } from "../interfaces/card-price-sort.interface";
import type { PriceSource } from "../interfaces/price-source.interface";

export const CARD_PRICE_SORT_FIELD_ROOT = "$price";

export const CARD_PRICE_SORT_CURRENCIES: readonly CardPriceSortCurrency[] = ["USD", "EUR"];

export const CARD_PRICE_SORT_DEFAULT_SOURCE_BY_CURRENCY: Record<CardPriceSortCurrency, PriceSource> = {
  USD: "tcgplayer",
  EUR: "cardmarket",
};

export const CARD_PRICE_FIELD_PATTERN = /price/i;

export const EUR_CARD_PRICE_FIELD_PATTERN = /eur|cardmarket/i;
