import type {
  PriceSource,
  PriceSourceFields,
} from "../interfaces/price-source.interface";

export const PRICE_SOURCES: PriceSource[] = ["tcgplayer", "cardmarket"];

export const DEFAULT_PRICE_SOURCE: PriceSource = "tcgplayer";

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
};
