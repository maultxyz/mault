import {
  CARD_PRICE_FIELD_PATTERN,
  CARD_PRICE_SORT_CURRENCIES,
  CARD_PRICE_SORT_DEFAULT_SOURCE_BY_CURRENCY,
  CARD_PRICE_SORT_FIELD_ROOT,
  EUR_CARD_PRICE_FIELD_PATTERN,
} from "./constants/card-price-sort.constant";
import { PRICE_SOURCE_FIELDS } from "./constants/price-source.constant";
import { SORTABLE_FIELD_TYPES } from "./constants/sort-bins.constant";
import type {
  CardPriceSortCurrency,
  CardPriceSortLabels,
} from "./interfaces/card-price-sort.interface";
import type { PriceSource } from "./interfaces/price-source.interface";
import type { FieldMeta } from "./interfaces/sort-bins.interface";

export function cardPriceSortField(currency: CardPriceSortCurrency): string {
  return `${CARD_PRICE_SORT_FIELD_ROOT}.${currency.toLowerCase()}`;
}

export function cardPriceSortCurrencyOf(field: string): CardPriceSortCurrency | null {
  return CARD_PRICE_SORT_CURRENCIES.find((currency) => cardPriceSortField(currency) === field) ?? null;
}

export function isCardPriceField(field: Pick<FieldMeta, "field" | "path">): boolean {
  if (cardPriceSortCurrencyOf(field.field) !== null) return false;
  return CARD_PRICE_FIELD_PATTERN.test(field.path) || CARD_PRICE_FIELD_PATTERN.test(field.field);
}

function cardPriceFieldCurrency(field: FieldMeta): CardPriceSortCurrency {
  return [field.path, field.field, field.label].some((text) => EUR_CARD_PRICE_FIELD_PATTERN.test(text))
    ? "EUR"
    : "USD";
}

function priceSourceCurrency(source: PriceSource): CardPriceSortCurrency {
  return PRICE_SOURCE_FIELDS[source].currency === "EUR" ? "EUR" : "USD";
}

export function cardPriceSortSource(
  currency: CardPriceSortCurrency,
  orgPriceSource: PriceSource,
): PriceSource {
  return priceSourceCurrency(orgPriceSource) === currency
    ? orgPriceSource
    : CARD_PRICE_SORT_DEFAULT_SOURCE_BY_CURRENCY[currency];
}

export function cardSortableFields(
  fieldDefinitions: FieldMeta[],
  orgPriceSource: PriceSource,
  labels: CardPriceSortLabels,
): FieldMeta[] {
  const sortable = fieldDefinitions.filter((field) => SORTABLE_FIELD_TYPES.includes(field.type));
  const firstPriceFieldIndex = sortable.findIndex(isCardPriceField);
  const currencies = new Set<CardPriceSortCurrency>([
    priceSourceCurrency(orgPriceSource),
    ...sortable.filter(isCardPriceField).map(cardPriceFieldCurrency),
  ]);
  const priceSortFields: FieldMeta[] = CARD_PRICE_SORT_CURRENCIES.filter((currency) =>
    currencies.has(currency),
  ).map((currency) => ({
    field: cardPriceSortField(currency),
    path: cardPriceSortField(currency),
    label: labels[currency],
    type: "numeric",
    operators: [],
  }));
  const otherFields = sortable.filter((field) => !isCardPriceField(field));
  const insertAt = firstPriceFieldIndex === -1 ? otherFields.length : firstPriceFieldIndex;
  return [...otherFields.slice(0, insertAt), ...priceSortFields, ...otherFields.slice(insertAt)];
}
