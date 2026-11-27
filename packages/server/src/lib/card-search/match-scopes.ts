import { defaultCatalogLangOf } from "@magic-vault/shared";
import type {
  CardMatchSearchResult,
  CollectionMatchScope,
} from "../interfaces/card-search";

export function matchScopeForGame(gameKey: string): CollectionMatchScope {
  return {
    gameKey,
    lang: defaultCatalogLangOf(gameKey),
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
