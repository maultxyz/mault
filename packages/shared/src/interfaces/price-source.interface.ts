export type PriceSource = "tcgplayer" | "cardmarket";

export interface PriceSourceFields {
  price: "price" | "priceEur";
  priceFoil: "priceFoil" | "priceEurFoil";
  currency: string;
  symbol: string;
}
