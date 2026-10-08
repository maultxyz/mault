export type PriceSource = "tcgplayer" | "cardmarket" | "cardkingdom";

export interface PriceSourceFields {
  price: "price" | "priceEur" | "priceCardKingdom";
  priceFoil: "priceFoil" | "priceEurFoil" | "priceCardKingdomFoil";
  currency: string;
  symbol: string;
}
