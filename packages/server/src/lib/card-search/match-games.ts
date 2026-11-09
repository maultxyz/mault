import {
  MATCH_GAME_DEFAULT_LANG,
  MATCH_GAME_KEYS_MAX,
  MATCH_GAME_LANG_BY_GAME_KEY,
} from "../constants/card-search";
import type {
  CardMatchSearchResult,
  CollectionMatchScope,
} from "../interfaces/card-search";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";

export function parseMatchGameKeys(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return [
    ...new Set(
      parsed.filter(
        (gameKey): gameKey is string =>
          typeof gameKey === "string" && gameKey in ADAPTERS_BY_GAME_KEY,
      ),
    ),
  ].slice(0, MATCH_GAME_KEYS_MAX);
}

export function matchScopeForGame(gameKey: string): CollectionMatchScope {
  return {
    gameKey,
    lang: MATCH_GAME_LANG_BY_GAME_KEY[gameKey] ?? MATCH_GAME_DEFAULT_LANG,
    matchAllLanguages: false,
  };
}

export function matchScopesForGames(
  collectionScope: CollectionMatchScope,
  matchGameKeys: string[],
): CollectionMatchScope[] {
  return [
    collectionScope,
    ...matchGameKeys
      .filter((gameKey) => gameKey !== collectionScope.gameKey)
      .map(matchScopeForGame),
  ];
}

function leadingDistance(result: CardMatchSearchResult): number {
  return (
    result.data?.[0]?.distance ??
    result.nearestDistance ??
    Number.POSITIVE_INFINITY
  );
}

export function tagWithGame<T extends CardMatchSearchResult>(
  result: T,
  gameKey: string,
): T {
  if (!result.data) return result;
  return {
    ...result,
    data: result.data.map((match) => ({
      ...match,
      gameKey,
      card: match.card ? { ...match.card, gameKey } : match.card,
    })),
  };
}

export async function findBestMatchAcrossGames<
  T extends CardMatchSearchResult,
>(
  scopes: CollectionMatchScope[],
  search: (scope: CollectionMatchScope) => Promise<T>,
): Promise<{ result: T; scope: CollectionMatchScope }> {
  const results = await Promise.all(
    scopes.map(async (scope) => ({ scope, result: await search(scope) })),
  );
  const matched = results.filter(({ result }) => !!result.data?.length);
  const pool = matched.length > 0 ? matched : results;
  return pool.reduce((closest, candidate) =>
    leadingDistance(candidate.result) < leadingDistance(closest.result)
      ? candidate
      : closest,
  );
}
