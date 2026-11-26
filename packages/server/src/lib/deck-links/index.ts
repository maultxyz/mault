import {
  COLLECTION_CSV_IMPORT_MAX_ROWS,
  COLLECTION_CSV_IMPORT_QUANTITY_MAX,
  COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH,
  type CollectionCsvImportRow,
  type DeckLinkReference,
  type DeckLinkSource,
} from "@magic-vault/shared";
import { fetchCardApi } from "../card-search/fetch";
import { CARD_API_HEADERS } from "../constants/card-search";
import { DECK_LINK_CACHE_MAX_ENTRIES, DECK_LINK_CACHE_TTL_MS } from "../constants/deck-links";
import type {
  DeckLinkCardLine,
  DeckLinkFetchResult,
  DeckLinkReader,
} from "../interfaces/deck-links";
import { createTtlCache } from "../ttl-cache";
import { archidektDeckReader } from "./archidekt";
import { moxfieldDeckReader } from "./moxfield";

const DECK_READERS_BY_SOURCE: Record<DeckLinkSource, DeckLinkReader> = {
  moxfield: moxfieldDeckReader,
  archidekt: archidektDeckReader,
};

const deckLinkCache = createTtlCache<DeckLinkFetchResult>({
  name: "deck-link-imports",
  ttlMs: DECK_LINK_CACHE_TTL_MS,
  maxEntries: DECK_LINK_CACHE_MAX_ENTRIES,
});

function clampedText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH) : null;
}

export function deckLinkImportRows(lines: DeckLinkCardLine[]): CollectionCsvImportRow[] {
  return lines
    .filter((line) => line.quantity > 0 && line.name.trim().length > 0)
    .slice(0, COLLECTION_CSV_IMPORT_MAX_ROWS)
    .map((line, index) => ({
      lineNumber: index + 1,
      name: line.name.trim().slice(0, COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH),
      setCode: clampedText(line.setCode)?.toLowerCase() ?? null,
      setName: null,
      collectorNumber: clampedText(line.collectorNumber),
      catalogId: clampedText(line.scryfallId),
      quantity: Math.min(line.quantity, COLLECTION_CSV_IMPORT_QUANTITY_MAX),
      isFoil: line.isFoil,
      condition: null,
      language: null,
      cost: null,
    }));
}

async function fetchDeck({ source, deckId }: DeckLinkReference): Promise<DeckLinkFetchResult> {
  const reader = DECK_READERS_BY_SOURCE[source];
  const response = await fetchCardApi(reader.apiUrl(deckId), {
    headers: CARD_API_HEADERS,
    redirect: "error",
  }).catch(() => null);
  if (!response) return { failure: "unavailable" };
  if (response.status === 404) return { failure: "notFound" };
  if (!response.ok) return { failure: "unavailable" };
  const body: unknown = await response.json().catch(() => null);
  const read = reader.readLines(body);
  if (!read) return { failure: "unavailable" };
  const rows = deckLinkImportRows(read.lines);
  if (rows.length === 0) return { failure: "empty" };
  return { deck: { source, deckName: read.deckName.trim(), rows } };
}

export async function fetchDeckLinkImport(
  reference: DeckLinkReference,
): Promise<DeckLinkFetchResult> {
  const cacheKey = `${reference.source}:${reference.deckId}`;
  const cached = deckLinkCache.get(cacheKey);
  if (cached) return cached;
  const result = await fetchDeck(reference);
  if (result.deck) deckLinkCache.set(cacheKey, result);
  return result;
}
