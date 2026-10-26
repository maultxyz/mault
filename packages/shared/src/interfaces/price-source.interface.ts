export type PriceSource = "tcgplayer" | "cardmarket" | "cardkingdom";

export interface PriceChangeSinceScan {
  percentLabel: string;
  direction: "up" | "down";
}

export interface PriceSourceFields {
  price: "price" | "priceEur" | "priceCardKingdom";
  priceFoil: "priceFoil" | "priceEurFoil" | "priceCardKingdomFoil";
  currency: string;
  symbol: string;
}
