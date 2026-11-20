import { describe, expect, it } from "vitest";
import {
  loadCatalogGameSearchPages,
  summarizeCatalogGameSearches,
  type CatalogCardSearchPage,
  type CatalogGameSearchState,
  type PlayingCard,
} from "@magic-vault/shared";

const magic = { gameKey: "mtg", gameName: "Magic", lang: "en", collectionGuid: "a" };
const pokemon = { gameKey: "pokemon", gameName: "Pokemon", lang: "en", collectionGuid: "b" };

function pageOf(names: string[], nextOffset: number | null): CatalogCardSearchPage {
  return {
    results: names.map((name) => ({ card: { id: name, name } as PlayingCard, printingCount: 1 })),
    nextOffset,
  };
}

function settledSearch(
  game: CatalogGameSearchState["game"],
  data: CatalogGameSearchState["data"],
  overrides: Partial<CatalogGameSearchState> = {},
): CatalogGameSearchState {
  return { game, data, isPending: false, isError: false, isFetching: false, isPlaceholderData: false, ...overrides };
}

describe("loadCatalogGameSearchPages", () => {
  it("follows next offsets up to the shown page count", async () => {
    const requestedOffsets: number[] = [];
    const result = await loadCatalogGameSearchPages(2, async (offset) => {
      requestedOffsets.push(offset);
      return pageOf([`card-${offset}`], offset + 8);
    });
    expect(requestedOffsets).toEqual([0, 8]);
    expect(result.pages).toHaveLength(2);
    expect(result.loadMoreFailed).toBe(false);
  });

  it("stops once a game runs out of cards", async () => {
    const result = await loadCatalogGameSearchPages(3, async () => pageOf(["only"], null));
    expect(result.pages).toHaveLength(1);
  });

  it("keeps loaded pages when a later page fails", async () => {
    const result = await loadCatalogGameSearchPages(2, async (offset) => {
      if (offset > 0) throw new Error("offline");
      return pageOf(["first"], 8);
    });
    expect(result).toEqual({ pages: [pageOf(["first"], 8)], loadMoreFailed: true });
  });

  it("fails when the first page fails", async () => {
    await expect(
      loadCatalogGameSearchPages(1, async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
  });
});

describe("summarizeCatalogGameSearches", () => {
  it("shows a game's results before slower games answer", () => {
    const summary = summarizeCatalogGameSearches([
      settledSearch(magic, undefined, { isPending: true, isFetching: true }),
      settledSearch(pokemon, { pages: [pageOf(["Pikachu"], null)], loadMoreFailed: false }),
    ]);
    expect(summary.results.map(({ card }) => card.name)).toEqual(["Pikachu"]);
    expect(summary.isLoadingFirstResults).toBe(false);
    expect(summary.isLoadingOtherGames).toBe(true);
  });

  it("orders results page by page, then by game", () => {
    const summary = summarizeCatalogGameSearches([
      settledSearch(magic, { pages: [pageOf(["Bolt"], 1), pageOf(["Shock"], null)], loadMoreFailed: false }),
      settledSearch(pokemon, { pages: [pageOf(["Pikachu"], null)], loadMoreFailed: false }),
    ]);
    expect(summary.results.map(({ card }) => card.name)).toEqual(["Bolt", "Pikachu", "Shock"]);
    expect(summary.hasMore).toBe(false);
  });

  it("offers more while any game has another page or a failed page to retry", () => {
    expect(
      summarizeCatalogGameSearches([settledSearch(magic, { pages: [pageOf(["Bolt"], 8)], loadMoreFailed: false })]).hasMore,
    ).toBe(true);
    const failedLoadMore = summarizeCatalogGameSearches([
      settledSearch(magic, { pages: [pageOf(["Bolt"], 8)], loadMoreFailed: true }),
    ]);
    expect(failedLoadMore.hasMore).toBe(true);
    expect(failedLoadMore.loadMoreFailed).toBe(true);
  });

  it("reports a failure only for games without results", () => {
    const summary = summarizeCatalogGameSearches([
      settledSearch(magic, undefined, { isError: true }),
      settledSearch(pokemon, { pages: [pageOf(["Pikachu"], null)], loadMoreFailed: false }),
    ]);
    expect(summary.failed).toBe(true);
    expect(summary.results).toHaveLength(1);
  });
});
