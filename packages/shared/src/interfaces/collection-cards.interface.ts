import type { PlayingCardWithDistance } from "./card.interface";
import type { ScannedCard } from "./scanner.interface";

export interface CardFilters {
  colors: string[];
  rarities: string[];
  bins: Array<number | null>;
  needsAttention: boolean;
  showDownloaded: boolean;
  sets: string[];
  minMatchPercent: number;
  foilTypes: string[];
}

export interface CollectionCardsQuery {
  search: string;
  sort: string | null;
  filters: CardFilters;
  grouped: boolean;
}

export interface GroupedScannedCard extends ScannedCard {
  scanIds: string[];
  quantity: number;
}

export interface CollectionCardsPage {
  items: GroupedScannedCard[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalCards: number;
}

export interface CollectionCardPosition {
  entry: ScannedCard;
  index: number;
  total: number;
  prevScanId: string | null;
  nextScanId: string | null;
  copyIndex: number;
  copyCount: number;
}

export interface CardStatsAggregate {
  totalCount: number;
  uniqueCount: number;
  totalValue: number;
  priceableCount: number;
  mostValuable: { name: string; price: number } | null;
  sets: { code: string; name: string; count: number; value: number }[];
  rarities: { key: string; count: number }[];
  colors: { key: string; count: number }[];
  foilTypes: { key: string; count: number }[];
}

export interface CollectionCardsSummary {
  all: CardStatsAggregate;
  filtered: CardStatsAggregate;
}

export interface BinWindow {
  binNumber: number;
  lastEmptiedAt: number | null;
}

export interface BinCardCount {
  binNumber: number;
  count: number;
}

export interface BinContentCard {
  scanId: string;
  binNumber: number;
  scannedAt: number;
  card: PlayingCardWithDistance;
}
