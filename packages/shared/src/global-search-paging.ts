import type {
  CatalogCardResult,
  CatalogCardSearchPage,
  CatalogGame,
  CatalogGameSearchPages,
  CatalogGameSearchState,
  CatalogSearchSummary,
} from "./interfaces/global-search.interface";

export function catalogSearchGameKey(game: Pick<CatalogGame, "gameKey" | "lang">): string {
  return `${game.gameKey}:${game.lang}`;
}

export async function loadCatalogGameSearchPages(
  shownPageCount: number,
  loadPageAtOffset: (offset: number) => Promise<CatalogCardSearchPage>,
): Promise<CatalogGameSearchPages> {
  const pages: CatalogCardSearchPage[] = [];
  let nextOffset: number | null = 0;
  while (nextOffset !== null && pages.length < shownPageCount) {
    try {
      const page: CatalogCardSearchPage = await loadPageAtOffset(nextOffset);
      pages.push(page);
      nextOffset = page.nextOffset;
    } catch (error) {
      if (pages.length === 0) throw error;
      return { pages, loadMoreFailed: true };
    }
  }
  return { pages, loadMoreFailed: false };
}

function gameHasMoreCatalogCards({ data }: CatalogGameSearchState): boolean {
  if (!data) return false;
  return data.loadMoreFailed || (data.pages.at(-1)?.nextOffset ?? null) !== null;
}

export function summarizeCatalogGameSearches(gameSearches: CatalogGameSearchState[]): CatalogSearchSummary {
  const loadedPageCount = Math.max(0, ...gameSearches.map(({ data }) => data?.pages.length ?? 0));
  const results: CatalogCardResult[] = [];
  for (let pageIndex = 0; pageIndex < loadedPageCount; pageIndex++) {
    for (const { game, data } of gameSearches) {
      const page = data?.pages[pageIndex];
      if (page) results.push(...page.results.map(({ card, printingCount }) => ({ game, card, printingCount })));
    }
  }
  const isAnyGameLoadingFirstPage = gameSearches.some(({ isPending }) => isPending);
  return {
    results,
    isLoadingFirstResults: results.length === 0 && isAnyGameLoadingFirstPage,
    isLoadingOtherGames: results.length > 0 && isAnyGameLoadingFirstPage,
    failed: gameSearches.some(({ isError, data }) => isError && !data),
    hasMore: gameSearches.some(gameHasMoreCatalogCards),
    isLoadingMore: gameSearches.some(
      ({ isFetching, isPlaceholderData, data }) => isFetching && (isPlaceholderData || data?.loadMoreFailed === true),
    ),
    loadMoreFailed: gameSearches.some(({ data }) => data?.loadMoreFailed === true),
  };
}
