import { usePriceSource } from "@/hooks/use-price-source";
import {
  cardSortableFields,
  DEFAULT_CARD_SORT,
  type FieldMeta,
  EMPTY_CARD_FILTERS,
  type CardFilters,
} from "@magic-vault/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
) {
  const { t } = useTranslation("cards");
  const { source: priceSource } = usePriceSource();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(DEFAULT_CARD_SORT);
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
    const { field } = splitSortKey(sortKey);
    if (!sortableFields.some((f) => f.field === field)) {
      setSortKey(DEFAULT_CARD_SORT);
    }
  }, [sortableFields, sortKey]);

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
