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

export interface TcgplayerHeadlinePrices {
  price: number | null;
  foilPrice: number | null;
  priceAtScan: number | null;
  foilPriceAtScan: number | null;
  isConditionPrice: boolean;
}
