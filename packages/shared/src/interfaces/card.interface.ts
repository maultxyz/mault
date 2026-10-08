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
  avg30: number | null;
  printings?: number;
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
  sourceUrl?: string;
  tcgplayerId?: string;
  cmc?: number;
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

export interface CardSetOption {
  code: string;
  name: string;
  cardCount: number;
}
