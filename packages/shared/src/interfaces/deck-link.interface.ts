import type { DECK_LINK_SOURCES } from "../constants/deck-link.constant";
import type { CollectionCsvImportRow } from "./collection-csv-import.interface";
import type { Result } from "./result.interface";

export type DeckLinkSource = (typeof DECK_LINK_SOURCES)[number];

export interface DeckLinkReference {
  source: DeckLinkSource;
  deckId: string;
}

export interface DeckLinkImport {
  source: DeckLinkSource;
  deckName: string;
  rows: CollectionCsvImportRow[];
}

export type DeckLinkImportFailure = "notFound" | "unavailable" | "empty";

export interface DeckLinkImportResult extends Result<DeckLinkImport> {
  failure?: DeckLinkImportFailure;
}

export interface DeckLinkImportRequest {
  url: string;
}
