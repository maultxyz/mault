import type { CardFilters } from "@/features/cards/types";
import {
  getCardValue,
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
      (entry) => (entry.alternativeMatches?.length ?? 0) > 0,
    );
  }

  if (!filters.showDownloaded) {
    result = result.filter((entry) => !entry.isDownloaded);
  }

  if (filters.sets.length > 0) {
    result = result.filter((entry) => filters.sets.includes(entry.card.set));
  }

  if (filters.minMatchPercent > 0) {
    result = result.filter(
      (entry) => (1 - entry.card.distance) * 100 >= filters.minMatchPercent,
    );
  }

  return result;
}

const EMPTY_FILTERS: CardFilters = {
  colors: [],
  rarities: [],
  bins: [],
  needsAttention: false,
  showDownloaded: false,
  sets: [],
  minMatchPercent: 0,
};

const SORTABLE_TYPES: FieldMeta["type"][] = ["string", "numeric", "enum"];

function splitSortKey(sortKey: string): { field: string; dir: "asc" | "desc" } {
  const i = sortKey.lastIndexOf("-");
  return {
    field: sortKey.slice(0, i),
    dir: sortKey.slice(i + 1) as "asc" | "desc",
  };
}

function compareByField(
  a: ScannedCard,
  b: ScannedCard,
  meta: FieldMeta,
  fieldDefinitions: FieldMeta[],
): number {
  const va = getCardValue(a.card, meta.field, fieldDefinitions);
  const vb = getCardValue(b.card, meta.field, fieldDefinitions);

  if (meta.type === "numeric") {
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va as number) - (vb as number);
  }

  if (meta.type === "enum" && meta.options) {
    const order = meta.options.map((o) => o.value);
    const ia = order.indexOf(String(va));
    const ib = order.indexOf(String(vb));
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
  }

  return String(va ?? "").localeCompare(String(vb ?? ""));
}

export function useCardFilterSort(
  cards: ScannedCard[],
  fieldDefinitions: FieldMeta[],
  external?: {
    filters: CardFilters;
    setFilters: (filters: CardFilters) => void;
  },
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>("scan-desc");
  const [internalFilters, setInternalFilters] =
    useState<CardFilters>(EMPTY_FILTERS);
  const filters = external?.filters ?? internalFilters;
  const setFilters = external?.setFilters ?? setInternalFilters;

  const sortableFields = useMemo(
    () => fieldDefinitions.filter((f) => SORTABLE_TYPES.includes(f.type)),
    [fieldDefinitions],
  );

  useEffect(() => {
    if (!sortKey || sortKey === "scan-desc") return;
    const { field } = splitSortKey(sortKey);
    if (!fieldDefinitions.some((f) => f.field === field)) {
      setSortKey("scan-desc");
    }
  }, [fieldDefinitions, sortKey]);

  const filteredAndSorted = useMemo(() => {
    let result = applyCardFilters(cards, filters);

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter((entry) => {
        const c = entry.card;
        return (
          c.name.toLowerCase().includes(query) ||
          c.setName.toLowerCase().includes(query) ||
          c.set.toLowerCase().includes(query) ||
          c.typeLine.toLowerCase().includes(query) ||
          c.collectorNumber.toLowerCase().includes(query) ||
          (c.text?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    if (!sortKey || sortKey === "scan-desc") return result;

    const { field, dir } = splitSortKey(sortKey);
    const meta = fieldDefinitions.find((f) => f.field === field);
    if (!meta) return result;

    const mul = dir === "asc" ? 1 : -1;
    const sorted = [...result];
    sorted.sort((a, b) => mul * compareByField(a, b, meta, fieldDefinitions));
    return sorted;
  }, [cards, searchQuery, sortKey, filters, fieldDefinitions]);

  const activeFilterCount =
    filters.colors.length +
    filters.rarities.length +
    filters.bins.length +
    filters.sets.length +
    (filters.needsAttention ? 1 : 0) +
    (filters.showDownloaded ? 1 : 0) +
    (filters.minMatchPercent > 0 ? 1 : 0);

  return {
    filteredAndSorted,
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
