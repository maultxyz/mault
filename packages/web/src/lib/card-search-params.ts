import {
  CARD_FILTER_BINS_PARAM,
  CARD_FILTER_ENABLED_PARAM_VALUE,
  CARD_FILTER_HIDE_DOWNLOADED_PARAM,
  CARD_FILTER_LIST_SEARCH_PARAMS,
  CARD_FILTER_MIN_MATCH_PERCENT_PARAM,
  CARD_FILTER_NEEDS_ATTENTION_PARAM,
  CARD_FILTER_NO_BIN_PARAM_VALUE,
  CARD_FILTER_SEARCH_PARAM_NAMES,
  CARD_REVIEW_SEARCH_PARAM,
} from "@/lib/constants/cards";
import {
  ALL_PUBLIC_CARD_GAMES,
  PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS,
  PUBLIC_CARD_FINISH_PARAM,
  PUBLIC_CARD_GAME_PARAM,
  PUBLIC_CARD_MAX_PRICE_PARAM,
  PUBLIC_CARD_MIN_PRICE_PARAM,
  PUBLIC_CARD_SORT_PARAM,
} from "@/lib/constants/public-cards";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  PUBLIC_CARD_FINISHES,
  PUBLIC_CARD_SORTS,
  type CardFilters,
  type PublicCardFilters,
  type PublicCardSort,
} from "@magic-vault/shared";

function writeListSearchParam(
  searchParams: URLSearchParams,
  name: string,
  values: readonly string[],
) {
  searchParams.delete(name);
  for (const value of values) searchParams.append(name, value);
}

export function writeTextSearchParam(
  searchParams: URLSearchParams,
  name: string,
  value: string,
  defaultValue = "",
) {
  if (value === defaultValue) searchParams.delete(name);
  else searchParams.set(name, value);
}

export function searchParamsSubsetKey(
  searchParams: URLSearchParams,
  names: readonly string[],
): string {
  const subset = new URLSearchParams();
  for (const name of names) {
    for (const value of searchParams.getAll(name)) subset.append(name, value);
  }
  return subset.toString();
}

export function readPageNumberSearchParam(
  searchParams: URLSearchParams,
  name: string,
): number {
  const pageNumber = Number(searchParams.get(name));
  return Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : 1;
}

export function writePageNumberSearchParam(
  searchParams: URLSearchParams,
  name: string,
  pageNumber: number,
) {
  if (pageNumber > 1) searchParams.set(name, String(pageNumber));
  else searchParams.delete(name);
}

export function readCardFiltersFromSearchParams(
  searchParams: URLSearchParams,
): CardFilters {
  const minMatchPercent = Number(
    searchParams.get(CARD_FILTER_MIN_MATCH_PERCENT_PARAM),
  );
  return {
    colors: searchParams.getAll(CARD_FILTER_LIST_SEARCH_PARAMS.colors),
    rarities: searchParams.getAll(CARD_FILTER_LIST_SEARCH_PARAMS.rarities),
    sets: searchParams.getAll(CARD_FILTER_LIST_SEARCH_PARAMS.sets),
    foilTypes: searchParams.getAll(CARD_FILTER_LIST_SEARCH_PARAMS.foilTypes),
    bins: searchParams
      .getAll(CARD_FILTER_BINS_PARAM)
      .map((value) =>
        value === CARD_FILTER_NO_BIN_PARAM_VALUE ? null : Number(value),
      )
      .filter((bin) => bin === null || Number.isInteger(bin)),
    needsAttention:
      searchParams.get(CARD_FILTER_NEEDS_ATTENTION_PARAM) ===
      CARD_FILTER_ENABLED_PARAM_VALUE,
    hideDownloaded:
      searchParams.get(CARD_FILTER_HIDE_DOWNLOADED_PARAM) ===
      CARD_FILTER_ENABLED_PARAM_VALUE,
    minMatchPercent:
      Number.isFinite(minMatchPercent) && minMatchPercent > 0
        ? Math.min(minMatchPercent, 100)
        : 0,
  };
}

export function writeCardFiltersToSearchParams(
  searchParams: URLSearchParams,
  filters: CardFilters,
) {
  writeListSearchParam(
    searchParams,
    CARD_FILTER_LIST_SEARCH_PARAMS.colors,
    filters.colors,
  );
  writeListSearchParam(
    searchParams,
    CARD_FILTER_LIST_SEARCH_PARAMS.rarities,
    filters.rarities,
  );
  writeListSearchParam(
    searchParams,
    CARD_FILTER_LIST_SEARCH_PARAMS.sets,
    filters.sets,
  );
  writeListSearchParam(
    searchParams,
    CARD_FILTER_LIST_SEARCH_PARAMS.foilTypes,
    filters.foilTypes,
  );
  writeListSearchParam(
    searchParams,
    CARD_FILTER_BINS_PARAM,
    filters.bins.map((bin) =>
      bin === null ? CARD_FILTER_NO_BIN_PARAM_VALUE : String(bin),
    ),
  );
  writeTextSearchParam(
    searchParams,
    CARD_FILTER_NEEDS_ATTENTION_PARAM,
    filters.needsAttention ? CARD_FILTER_ENABLED_PARAM_VALUE : "",
  );
  writeTextSearchParam(
    searchParams,
    CARD_FILTER_HIDE_DOWNLOADED_PARAM,
    filters.hideDownloaded ? CARD_FILTER_ENABLED_PARAM_VALUE : "",
  );
  writeTextSearchParam(
    searchParams,
    CARD_FILTER_MIN_MATCH_PERCENT_PARAM,
    filters.minMatchPercent > 0 ? String(filters.minMatchPercent) : "",
  );
}

export function cardFiltersSearchParamsKey(
  searchParams: URLSearchParams,
): string {
  return searchParamsSubsetKey(searchParams, CARD_FILTER_SEARCH_PARAM_NAMES);
}

export function cardGridPathKeepingSearchParams(
  path: string,
  searchParams: URLSearchParams,
  reviewParamValue: string | null,
): string {
  const nextSearchParams = new URLSearchParams(searchParams);
  if (reviewParamValue) {
    nextSearchParams.set(CARD_REVIEW_SEARCH_PARAM, reviewParamValue);
  } else {
    nextSearchParams.delete(CARD_REVIEW_SEARCH_PARAM);
  }
  const search = nextSearchParams.toString();
  return search ? `${path}?${search}` : path;
}

export function readPublicCardSortFromSearchParams(
  searchParams: URLSearchParams,
): PublicCardSort {
  const sort = searchParams.get(PUBLIC_CARD_SORT_PARAM);
  return (
    PUBLIC_CARD_SORTS.find((option) => option === sort) ??
    DEFAULT_PUBLIC_CARD_SORT
  );
}

export function readPublicCardGameKeyFromSearchParams(
  searchParams: URLSearchParams,
): string {
  return searchParams.get(PUBLIC_CARD_GAME_PARAM) ?? ALL_PUBLIC_CARD_GAMES;
}

export function readPublicCardFiltersFromSearchParams(
  searchParams: URLSearchParams,
): PublicCardFilters {
  const finish = searchParams.get(PUBLIC_CARD_FINISH_PARAM);
  return {
    ...EMPTY_PUBLIC_CARD_FILTERS,
    sets: searchParams.getAll(PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.sets),
    rarities: searchParams.getAll(
      PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.rarities,
    ),
    colors: searchParams.getAll(PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.colors),
    foilTypes: searchParams.getAll(
      PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.foilTypes,
    ),
    conditions: searchParams.getAll(
      PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.conditions,
    ),
    languages: searchParams.getAll(
      PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.languages,
    ),
    finish:
      PUBLIC_CARD_FINISHES.find((option) => option === finish) ??
      EMPTY_PUBLIC_CARD_FILTERS.finish,
  };
}

export function writePublicCardFiltersToSearchParams(
  searchParams: URLSearchParams,
  filters: PublicCardFilters,
) {
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.sets,
    filters.sets,
  );
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.rarities,
    filters.rarities,
  );
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.colors,
    filters.colors,
  );
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.foilTypes,
    filters.foilTypes,
  );
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.conditions,
    filters.conditions,
  );
  writeListSearchParam(
    searchParams,
    PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS.languages,
    filters.languages,
  );
  writeTextSearchParam(
    searchParams,
    PUBLIC_CARD_FINISH_PARAM,
    filters.finish,
    EMPTY_PUBLIC_CARD_FILTERS.finish,
  );
}

export function clearPublicCardPriceSearchParams(
  searchParams: URLSearchParams,
) {
  searchParams.delete(PUBLIC_CARD_MIN_PRICE_PARAM);
  searchParams.delete(PUBLIC_CARD_MAX_PRICE_PARAM);
}
