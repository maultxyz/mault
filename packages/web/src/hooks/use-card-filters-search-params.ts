import {
  cardFiltersSearchParamsKey,
  readCardFiltersFromSearchParams,
  writeCardFiltersToSearchParams,
} from "@/lib/card-search-params";
import type { CardFiltersSearchParamsState } from "@/lib/interfaces/cards";
import type { CardFilters } from "@magic-vault/shared";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export function useCardFiltersSearchParams(): CardFiltersSearchParamsState {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFiltersKey = cardFiltersSearchParamsKey(searchParams);
  const filters = useMemo(
    () => readCardFiltersFromSearchParams(new URLSearchParams(urlFiltersKey)),
    [urlFiltersKey],
  );

  const updateFilters = useCallback(
    (update: (previous: CardFilters) => CardFilters) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          writeCardFiltersToSearchParams(
            next,
            update(readCardFiltersFromSearchParams(previous)),
          );
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const setFilters = useCallback(
    (nextFilters: CardFilters) => updateFilters(() => nextFilters),
    [updateFilters],
  );

  return useMemo(
    () => ({ filters, setFilters, updateFilters }),
    [filters, setFilters, updateFilters],
  );
}
