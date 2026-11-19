import type { PlayingCard } from "./card.interface";
import type { OwnedCardSearchResult } from "./owned-card-search.interface";

export interface CatalogGame {
  gameKey: string;
  gameName: string;
  lang: string;
  collectionGuid: string;
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

export type CatalogSearchOffsetsByGame = Record<string, number>;

export interface CatalogCardsSearchPage {
  results: CatalogCardResult[];
  nextOffsetsByGame: CatalogSearchOffsetsByGame | null;
}
