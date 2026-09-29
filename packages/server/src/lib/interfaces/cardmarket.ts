export interface CardmarketPriceGuideEntry {
  idProduct: number;
  avg: number | null;
  low: number | null;
  trend: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  "avg-foil": number | null;
  "low-foil": number | null;
  "trend-foil": number | null;
  "avg1-foil": number | null;
  "avg7-foil": number | null;
  "avg30-foil": number | null;
}

export interface CardmarketPriceGuideFile {
  createdAt: string;
  priceGuides: CardmarketPriceGuideEntry[];
}

export interface CardmarketProduct {
  idProduct: number;
  name: string;
  idExpansion: number | null;
  idMetacard: number | null;
}

export interface CardmarketProductsFile {
  createdAt: string;
  products: CardmarketProduct[];
}

export interface CardmarketSyncResult {
  prices: number;
  products: number;
  skippedGames: number;
  failedGames: number;
}
