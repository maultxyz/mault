import {
  cardFiltersSearchParamsKey,
  cardGridPathKeepingSearchParams,
  readCardFiltersFromSearchParams,
  readPageNumberSearchParam,
  readPublicCardFiltersFromSearchParams,
  readPublicCardSortFromSearchParams,
  writeCardFiltersToSearchParams,
  writePageNumberSearchParam,
  writePublicCardFiltersToSearchParams,
} from "@/lib/card-search-params";
import {
  EMPTY_CARD_FILTERS,
  EMPTY_PUBLIC_CARD_FILTERS,
  type CardFilters,
} from "@magic-vault/shared";
import { describe, expect, it } from "vitest";

describe("card filter search params", () => {
  it("keeps default filters out of the URL", () => {
    const searchParams = new URLSearchParams("t=token");
    writeCardFiltersToSearchParams(searchParams, EMPTY_CARD_FILTERS);
    expect(searchParams.toString()).toBe("t=token");
    expect(readCardFiltersFromSearchParams(searchParams)).toEqual(
      EMPTY_CARD_FILTERS,
    );
  });

  it("round-trips every filter, including the no-bin value and commas", () => {
    const filters: CardFilters = {
      colors: ["W", "U"],
      rarities: ["rare"],
      bins: [2, null],
      needsAttention: true,
      hideDownloaded: true,
      sets: ["Rock, Paper"],
      minMatchPercent: 80,
      foilTypes: ["Reverse Holo"],
    };
    const searchParams = new URLSearchParams("page=3");
    writeCardFiltersToSearchParams(searchParams, filters);
    expect(searchParams.get("page")).toBe("3");
    expect(readCardFiltersFromSearchParams(searchParams)).toEqual(filters);
  });

  it("ignores unrelated params in the filters key", () => {
    const first = new URLSearchParams("sets=abc&page=2&q=bolt");
    const second = new URLSearchParams("page=5&sets=abc");
    expect(cardFiltersSearchParamsKey(first)).toBe(
      cardFiltersSearchParamsKey(second),
    );
  });

  it("drops malformed bin and match values", () => {
    const filters = readCardFiltersFromSearchParams(
      new URLSearchParams("bins=abc&bins=3&minMatch=nope"),
    );
    expect(filters.bins).toEqual([3]);
    expect(filters.minMatchPercent).toBe(0);
  });
});

describe("page number search param", () => {
  it("reads missing or invalid pages as the first page", () => {
    expect(readPageNumberSearchParam(new URLSearchParams(), "page")).toBe(1);
    expect(
      readPageNumberSearchParam(new URLSearchParams("page=-4"), "page"),
    ).toBe(1);
    expect(
      readPageNumberSearchParam(new URLSearchParams("page=4"), "page"),
    ).toBe(4);
  });

  it("keeps the first page out of the URL", () => {
    const searchParams = new URLSearchParams("page=4");
    writePageNumberSearchParam(searchParams, "page", 1);
    expect(searchParams.has("page")).toBe(false);
  });
});

describe("cardGridPathKeepingSearchParams", () => {
  it("keeps view state and sets or clears the review param", () => {
    const searchParams = new URLSearchParams("q=bolt&review=grid");
    expect(
      cardGridPathKeepingSearchParams("/app/cards/1", searchParams, "1"),
    ).toBe("/app/cards/1?q=bolt&review=1");
    expect(cardGridPathKeepingSearchParams("/app", searchParams, null)).toBe(
      "/app?q=bolt",
    );
    expect(
      cardGridPathKeepingSearchParams("/app", new URLSearchParams(), null),
    ).toBe("/app");
  });
});

describe("public card search params", () => {
  it("keeps the share token and leaves defaults out", () => {
    const searchParams = new URLSearchParams("t=token");
    writePublicCardFiltersToSearchParams(
      searchParams,
      EMPTY_PUBLIC_CARD_FILTERS,
    );
    expect(searchParams.toString()).toBe("t=token");
  });

  it("round-trips filters and rejects unknown sort and finish values", () => {
    const filters = {
      ...EMPTY_PUBLIC_CARD_FILTERS,
      sets: ["abc"],
      languages: ["ja"],
      finish: "foil" as const,
    };
    const searchParams = new URLSearchParams("t=token");
    writePublicCardFiltersToSearchParams(searchParams, filters);
    expect(searchParams.get("t")).toBe("token");
    expect(readPublicCardFiltersFromSearchParams(searchParams)).toEqual(
      filters,
    );
    const invalid = new URLSearchParams("sort=bogus&finish=shiny");
    expect(readPublicCardSortFromSearchParams(invalid)).toBe("newest");
    expect(readPublicCardFiltersFromSearchParams(invalid).finish).toBe("all");
  });
});
