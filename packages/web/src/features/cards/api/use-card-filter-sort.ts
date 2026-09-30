import type { CardFilters } from "@/lib/interfaces/cards";
import { EMPTY_CARD_FILTERS } from "@/lib/constants/card-filters";
import { matchPercent } from "@/lib/utils";
import {
  DEFAULT_CARD_SORT,
  type FieldMeta,
  type ScannedCard,
} from "@magic-vault/shared";
import { useEffect, useMemo, useState } from "react";

export function applyCardFilters(
  cards: ScannedCard[],
  filters: CardFilters,
): ScannedCard[] {
  let result = cards;

  if (filters.colors.length > 0) {
    result = result.filter((entry) => {
      const identity = entry.card.colorIdentity ?? [];
      if (filters.colors.includes("C") && identity.length === 0) return true;
      return filters.colors.some((c) => c !== "C" && identity.includes(c));
    });
  }

  if (filters.rarities.length > 0) {
    result = result.filter((entry) =>
      filters.rarities.includes(entry.card.rarity),
    );
  }

  if (filters.bins.length > 0) {
    result = result.filter((entry) =>
      filters.bins.includes(entry.binNumber ?? null),
    );
  }

  if (filters.needsAttention) {
    result = result.filter(
      (entry) =>
        ((entry.alternativeMatches?.length ?? 0) > 0 || !!entry.needsReview) &&
        !entry.corrected,
    );
  }

  if (!filters.showDownloaded) {
    result = result.filter((entry) => !entry.isDownloaded);
  }

  if (filters.sets.length > 0) {
    result = result.filter((entry) => filters.sets.includes(entry.card.set));
  }

  if (filters.foilTypes.length > 0) {
    result = result.filter((entry) => {
      const label = entry.foilType ?? (entry.isFoil ? "Foil" : null);
      return label != null && filters.foilTypes.includes(label);
    });
  }

  if (filters.minMatchPercent > 0) {
    result = result.filter(
      (entry) =>
        matchPercent(entry.card) >= filters.minMatchPercent,
    );
  }

  return result;
}

const SORTABLE_TYPES: FieldMeta["type"][] = ["string", "numeric", "enum"];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(DEFAULT_CARD_SORT);
  const [internalFilters, setInternalFilters] =
    useState<CardFilters>(EMPTY_CARD_FILTERS);
  const filters = external?.filters ?? internalFilters;
  const setFilters = external?.setFilters ?? setInternalFilters;

  const sortableFields = useMemo(
    () => fieldDefinitions.filter((f) => SORTABLE_TYPES.includes(f.type)),
    [fieldDefinitions],
  );

  useEffect(() => {
    if (!sortKey || sortKey === DEFAULT_CARD_SORT) return;
    const { field } = splitSortKey(sortKey);
    if (!fieldDefinitions.some((f) => f.field === field)) {
      setSortKey(DEFAULT_CARD_SORT);
    }
  }, [fieldDefinitions, sortKey]);

  const activeFilterCount =
    filters.colors.length +
    filters.rarities.length +
    filters.bins.length +
    filters.sets.length +
    filters.foilTypes.length +
    (filters.needsAttention ? 1 : 0) +
    (filters.showDownloaded ? 1 : 0) +
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
