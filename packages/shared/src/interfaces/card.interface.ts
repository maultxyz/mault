import type { SearchNoMatchReason } from "./api.interface";
import type { PriceSource } from "./price-source.interface";

export type SourceCard = object;

export interface PlayingCardImage {
  small: string;
  normal: string;
}

export interface PlayingCardPriceRange {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  printings?: number;
}

export interface PlayingCardCardmarketPrice {
  low: number | null;
  trend: number | null;
  avg: number | null;
  avg7: number | null;
  avg30: number | null;
  printings?: number;
}

export interface PlayingCardCardKingdomPrice {
  retail: number | null;
  buylist: number | null;
  inStock: number | null;
  url: string | null;
}

export type CardPurchaseLinks = Partial<Record<PriceSource, string>>;

export type CardPricesAtScan = Partial<
  Pick<
    PlayingCard,
    | "price"
    | "priceFoil"
    | "priceEur"
    | "priceEurFoil"
    | "priceCardKingdom"
    | "priceCardKingdomFoil"
  >
>;

export type CardFinishPrices = Partial<
  Pick<PlayingCard, "priceFoil" | "priceEurFoil" | "priceCardKingdomFoil">
>;

export interface CardFinishMatch {
  foilType: string;
  distance: number;
}

export interface CardFinish {
  isFoil?: boolean | null;
  foilType?: string | null;
}

export interface PlayingCard {
  id: string;
  name: string;
  image: PlayingCardImage | null;
  set: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  typeLine: string;
  text?: string;
  manaCost?: string;
  power?: string;
  toughness?: string;
  colorIdentity: string[];
  artist?: string;
  price: number | null;
  priceFoil: number | null;
  priceRange?: PlayingCardPriceRange;
  priceRangeFoil?: PlayingCardPriceRange;
  priceEur?: number | null;
  priceEurFoil?: number | null;
  cardmarketPrice?: PlayingCardCardmarketPrice;
  cardmarketPriceFoil?: PlayingCardCardmarketPrice;
  priceCardKingdom?: number | null;
  priceCardKingdomFoil?: number | null;
  cardKingdomPrice?: PlayingCardCardKingdomPrice;
  cardKingdomPriceFoil?: PlayingCardCardKingdomPrice;
  pricesAtScan?: CardPricesAtScan;
  foilTypes?: string[];
  finishPrices?: Record<string, CardFinishPrices>;
  finishMatches?: CardFinishMatch[];
  purchaseLinks?: CardPurchaseLinks;
  sourceUrl?: string;
  tcgplayerId?: string;
  cmc?: number;
  lang?: string;
  raw?: unknown;
}

export interface CardSearchPage {
  cards: PlayingCard[];
  nextOffset: number | null;
}

export interface PlayingCardWithDistance extends PlayingCard {
  distance: number;
  confidence?: number;
}

export interface PrintingScoreHit {
  id: string;
  name: string;
  set: string;
  collectorNumber: string;
  image: PlayingCardImage | null;
  distance: number;
}

export type PrintingScoreVerdict = "accept" | "other_card" | SearchNoMatchReason;

export interface PrintingScoreResult {
  success: true;
  found: boolean;
  distanceThreshold: number;
  verdict: PrintingScoreVerdict;
  card: PrintingScoreHit | null;
  nearest: PrintingScoreHit | null;
}

export interface CardSetOption {
  code: string;
  name: string;
  cardCount: number;
}

export interface SetPrintingOption {
  id: string;
  name: string;
  collectorNumber: string;
}
