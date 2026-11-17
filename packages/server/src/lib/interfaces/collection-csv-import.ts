import type {
  CollectionCsvImportResult,
  CollectionCsvImportRow,
  PlayingCard,
} from "@magic-vault/shared";

export interface CatalogImportCandidate {
  card_id: string;
  name: string;
  set_code: string;
  set_name: string | null;
  collector_number: string | null;
}

export interface ResolvedCollectionCsvImport {
  collectionId: number;
  scope: { gameKey: string; lang: string };
  matched: { row: CollectionCsvImportRow; card: PlayingCard }[];
  result: CollectionCsvImportResult;
}
