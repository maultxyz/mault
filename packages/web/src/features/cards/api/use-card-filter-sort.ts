import { usePriceSource } from "@/hooks/use-price-source";
import {
  cardSortableFields,
  DEFAULT_CARD_SORT,
  type FieldMeta,
  EMPTY_CARD_FILTERS,
  type CardFilters,
} from "@magic-vault/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useDebouncedSearchParamText } from "@/hooks/use-debounced-search-param-text";
import { writeTextSearchParam } from "@/lib/card-search-params";
import {
  CARD_GRID_SEARCH_QUERY_PARAM,
  CARD_GRID_SORT_PARAM,
} from "@/lib/constants/cards";
import type { CardQueryStateOptions } from "@/lib/interfaces/cards";

function splitSortKey(sortKey: string): { field: string; dir: "asc" | "desc" } {
  const i = sortKey.lastIndexOf("-");
  return {
    field: sortKey.slice(0, i),
    dir: sortKey.slice(i + 1) as "asc" | "desc",
  };
}

export function useCardQueryState(
  fieldDefinitions: FieldMeta[],
  external?: {
    filters: CardFilters;
    setFilters: (filters: CardFilters) => void;
  },
  { persistsSearchAndSortInUrl = false }: CardQueryStateOptions = {},
) {
  const { t } = useTranslation("cards");
  const { source: priceSource } = usePriceSource();
  const [searchParams, setSearchParams] = useSearchParams();
  const { text: searchQuery, setText: setSearchQuery } =
    useDebouncedSearchParamText(CARD_GRID_SEARCH_QUERY_PARAM, {
      isPersistedInUrl: persistsSearchAndSortInUrl,
    });

  const [internalSortKey, setInternalSortKey] = useState<string | null>(
    DEFAULT_CARD_SORT,
  );
  const sortKey = persistsSearchAndSortInUrl
    ? (searchParams.get(CARD_GRID_SORT_PARAM) ?? DEFAULT_CARD_SORT)
    : internalSortKey;
  const setSortKey = useCallback(
    (nextSortKey: string | null) => {
      if (!persistsSearchAndSortInUrl) {
        setInternalSortKey(nextSortKey);
        return;
      }
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          writeTextSearchParam(
            next,
            CARD_GRID_SORT_PARAM,
            nextSortKey ?? DEFAULT_CARD_SORT,
            DEFAULT_CARD_SORT,
          );
          return next;
        },
        { replace: true },
      );
    },
    [persistsSearchAndSortInUrl, setSearchParams],
  );
  const [internalFilters, setInternalFilters] =
    useState<CardFilters>(EMPTY_CARD_FILTERS);
  const filters = external?.filters ?? internalFilters;
  const setFilters = external?.setFilters ?? setInternalFilters;

  const sortableFields = useMemo(
    () =>
      cardSortableFields(fieldDefinitions, priceSource, {
        USD: t("cardToolbar.priceSort.usd"),
        EUR: t("cardToolbar.priceSort.eur"),
      }),
    [fieldDefinitions, priceSource, t],
  );

  useEffect(() => {
    if (!sortKey || sortKey === DEFAULT_CARD_SORT) return;
    if (persistsSearchAndSortInUrl && fieldDefinitions.length === 0) return;
    const { field } = splitSortKey(sortKey);
    if (!sortableFields.some((f) => f.field === field)) {
      setSortKey(DEFAULT_CARD_SORT);
    }
  }, [
    sortableFields,
    sortKey,
    setSortKey,
    persistsSearchAndSortInUrl,
    fieldDefinitions.length,
  ]);

  const activeFilterCount =
    filters.colors.length +
    filters.rarities.length +
    filters.bins.length +
    filters.sets.length +
    filters.foilTypes.length +
    (filters.needsAttention ? 1 : 0) +
    (filters.hideDownloaded ? 1 : 0) +
    (filters.minMatchPercent > 0 ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
  };
}
