import { GLOBAL_SEARCH_MAX_LOCAL_RESULTS } from "./constants/global-search.constant";
import type { PlayingCard } from "./interfaces/card.interface";
import type { Collection } from "./interfaces/collections.interface";
import type { CatalogGame } from "./interfaces/global-search.interface";

export function normalizeGlobalSearchQuery(rawQuery: string): string {
  return rawQuery.trim().toLowerCase();
}

function globalSearchMatchRank(text: string, normalizedQuery: string): number | null {
  const normalizedText = text.toLowerCase();
  if (normalizedText.startsWith(normalizedQuery)) return 0;
  return normalizedText.includes(normalizedQuery) ? 1 : null;
}

export function rankGlobalSearchMatches<T>(
  items: readonly T[],
  textOf: (item: T) => string,
  rawQuery: string,
  maxResults = GLOBAL_SEARCH_MAX_LOCAL_RESULTS,
): T[] {
  const normalizedQuery = normalizeGlobalSearchQuery(rawQuery);
  if (!normalizedQuery) return [];
  return items
    .map((item) => ({ item, rank: globalSearchMatchRank(textOf(item), normalizedQuery) }))
    .filter((entry): entry is { item: T; rank: number } => entry.rank !== null)
    .sort((first, second) => first.rank - second.rank || textOf(first.item).localeCompare(textOf(second.item)))
    .slice(0, maxResults)
    .map((entry) => entry.item);
}

export function catalogGamesOf(collections: readonly Collection[], preferredCollectionGuid?: string): CatalogGame[] {
  const ordered = [...collections].sort((first, second) =>
    first.guid === preferredCollectionGuid ? -1 : second.guid === preferredCollectionGuid ? 1 : 0,
  );
  const catalogGamesByGameKey = new Map<string, CatalogGame>();
  for (const collection of ordered) {
    const game = collection.game;
    if (!game || catalogGamesByGameKey.has(game.key)) continue;
    catalogGamesByGameKey.set(game.key, {
      gameKey: game.key,
      gameName: game.name,
      lang: collection.lang || "en",
      collectionGuid: collection.guid,
    });
  }
  return [...catalogGamesByGameKey.values()];
}

export function catalogPrintingLabel(printing: PlayingCard): string {
  const setLabel = printing.setName || printing.set.toUpperCase();
  return printing.collectorNumber ? `${setLabel} #${printing.collectorNumber}` : setLabel;
}

export function isGlobalSearchGameSelected(selectedGameKey: string | null, gameKey: string | null | undefined): boolean {
  return selectedGameKey === null || gameKey === selectedGameKey;
}

export function globalSearchGamesFor(games: CatalogGame[], selectedGameKey: string | null): CatalogGame[] {
  return games.filter((game) => isGlobalSearchGameSelected(selectedGameKey, game.gameKey));
}

export function selectedGlobalSearchGameKey(games: CatalogGame[], requestedGameKey: string | null): string | null {
  return requestedGameKey && games.some((game) => game.gameKey === requestedGameKey) ? requestedGameKey : null;
}
