export interface PlayingCardImage {
  small: string;
  normal: string;
}

export interface PlayingCardPriceRange {
  low: number | null;
  mid: number | null;
  high: number | null;
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
  sourceUrl?: string;
  tcgplayerId?: string;
  cmc?: number;
  raw?: unknown;
}

export interface PlayingCardWithDistance extends PlayingCard {
  distance: number;
  confidence?: number;
}
