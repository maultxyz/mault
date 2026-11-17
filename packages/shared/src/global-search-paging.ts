import type { CatalogGame, CatalogSearchOffsetsByGame } from "./interfaces/global-search.interface";

export function catalogSearchGameKey(game: Pick<CatalogGame, "gameKey" | "lang">): string {
  return `${game.gameKey}:${game.lang}`;
}

export function initialCatalogOffsetsByGame(games: CatalogGame[]): CatalogSearchOffsetsByGame {
  return Object.fromEntries(games.map((game) => [catalogSearchGameKey(game), 0]));
}

export function nextCatalogOffsetsByGame(
  pages: { gameKey: string; nextOffset: number | null }[],
): CatalogSearchOffsetsByGame | null {
  const remaining = pages.flatMap(({ gameKey, nextOffset }) =>
    nextOffset === null ? [] : [[gameKey, nextOffset] as const],
  );
  return remaining.length > 0 ? Object.fromEntries(remaining) : null;
}
