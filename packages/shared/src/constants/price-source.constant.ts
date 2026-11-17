import type {
  PriceSource,
  PriceSourceFields,
} from "../interfaces/price-source.interface";

export const PRICE_SOURCES: PriceSource[] = [
  "tcgplayer",
  "cardmarket",
  "cardkingdom",
];

export const DEFAULT_PRICE_SOURCE: PriceSource = "tcgplayer";

export const PRICE_SOURCE_STORE_NAME_KEYS: Record<PriceSource, string> = {
  tcgplayer: "priceTable.heading",
  cardmarket: "priceTable.cardmarketHeading",
  cardkingdom: "priceTable.cardKingdomHeading",
};

export const CARD_PRICE_AT_SCAN_KEYS = [
  "price",
  "priceFoil",
  "priceEur",
  "priceEurFoil",
  "priceCardKingdom",
  "priceCardKingdomFoil",
] as const;

export const PRICE_SOURCE_FIELDS: Record<PriceSource, PriceSourceFields> = {
  tcgplayer: {
    price: "price",
    priceFoil: "priceFoil",
    currency: "USD",
    symbol: "$",
  },
  cardmarket: {
    price: "priceEur",
    priceFoil: "priceEurFoil",
    currency: "EUR",
    symbol: "€",
  },
  cardkingdom: {
    price: "priceCardKingdom",
    priceFoil: "priceCardKingdomFoil",
    currency: "USD",
    symbol: "$",
  },
};
