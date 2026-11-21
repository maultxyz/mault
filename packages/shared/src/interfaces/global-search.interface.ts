import type { PlayingCard } from "./card.interface";
import type { OwnedCardSearchResult } from "./owned-card-search.interface";

export interface CatalogGame {
  gameKey: string;
  gameName: string;
  lang: string;
  collectionGuid: string | null;
}

export interface CatalogCardSearchResult {
  card: PlayingCard;
  printingCount: number;
}

export interface CatalogCardSearchPage {
  results: CatalogCardSearchResult[];
  nextOffset: number | null;
}

export interface CardPrintingsPage {
  cards: PlayingCard[];
  totalCount: number;
  nextOffset: number | null;
}

export interface CatalogCardResult {
  game: CatalogGame;
  card: PlayingCard;
  printingCount: number;
}

export interface AddCatalogCardInput {
  collectionGuid: string;
  card: PlayingCard;
}

export interface OwnedCardSearchPage {
  results: OwnedCardSearchResult[];
  nextOffset: number | null;
}

export interface CatalogGameSearchPages {
  pages: CatalogCardSearchPage[];
  loadMoreFailed: boolean;
}

export interface CatalogGameSearchState {
  game: CatalogGame;
  data: CatalogGameSearchPages | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
}

export interface CatalogSearchSummary {
  results: CatalogCardResult[];
  isLoadingFirstResults: boolean;
  isLoadingOtherGames: boolean;
  failed: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
}
