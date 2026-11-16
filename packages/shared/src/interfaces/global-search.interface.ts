import type { PlayingCard } from "./card.interface";

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
