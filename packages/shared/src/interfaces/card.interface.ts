export interface PlayingCardImage {
  small: string;
  normal: string;
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
  sourceUrl?: string;
  tcgplayerId?: string;
  cmc?: number;
  raw?: unknown;
}

export interface PlayingCardWithDistance extends PlayingCard {
  distance: number;
  confidence?: number;
}
