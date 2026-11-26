import type { DeckLinkImport, DeckLinkImportFailure } from "@magic-vault/shared";

export type DeckLinkFetchResult =
  | { deck: DeckLinkImport; failure?: undefined }
  | { deck?: undefined; failure: DeckLinkImportFailure };

export interface DeckLinkCardLine {
  name: string;
  quantity: number;
  setCode: string | null;
  collectorNumber: string | null;
  scryfallId: string | null;
  isFoil: boolean | null;
}

export interface DeckLinkLines {
  deckName: string;
  lines: DeckLinkCardLine[];
}

export interface DeckLinkReader {
  apiUrl: (deckId: string) => string;
  readLines: (body: unknown) => DeckLinkLines | null;
}
