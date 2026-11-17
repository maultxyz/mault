import {
  cardSortableFields,
  cardSortDirectionForField,
  DEFAULT_CARD_SORT,
  nextCardSortKeyForField,
  type CardFilters,
  type CollectionCardsQuery,
  type FieldMeta,
  isScanTimelineGrouping,
  type PriceSource,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { COLLECTION_SCAN_TIMELINE_KEY } from "@/lib/constants/collections";
import type { CardSortOption, CollectionCardsQueryInput, CollectionScanTimeline } from "@/lib/interfaces/collections";
import { readKv } from "@/lib/storage/kv";

export function readStoredCollectionScanTimeline(): CollectionScanTimeline {
  const stored = readKv(COLLECTION_SCAN_TIMELINE_KEY);
  return isScanTimelineGrouping(stored) ? stored : "off";
}

export function buildCollectionCardsQuery({
  search,
  sort,
  filters,
  grouped,
  scanTimeline,
}: CollectionCardsQueryInput): CollectionCardsQuery {
  const isTimeline = scanTimeline !== "off";
  return { search, sort: isTimeline ? null : sort, filters, grouped: isTimeline ? false : grouped };
}

export function countActiveCardFilters(filters: CardFilters): number {
  return (
    filters.colors.length +
    filters.rarities.length +
    filters.foilTypes.length +
    filters.bins.length +
    filters.sets.length +
    (filters.hideDownloaded ? 1 : 0)
  );
}

export function cardSortOptions(
  fieldDefinitions: FieldMeta[],
  defaultSortLabel: string,
  selectedSort: string | null,
  priceSource: PriceSource,
  t: TFunction,
): CardSortOption[] {
  return [
    {
      key: DEFAULT_CARD_SORT,
      label: defaultSortLabel,
      selected: !selectedSort || selectedSort === DEFAULT_CARD_SORT,
      sortKeyOnPress: DEFAULT_CARD_SORT,
    },
    ...cardSortableFields(fieldDefinitions, priceSource, {
      USD: t("collection.sort.priceUsd"),
      EUR: t("collection.sort.priceEur"),
    }).map((field) => {
        const direction = cardSortDirectionForField(selectedSort, field.field);
        return {
          key: field.field,
          label:
            direction === "asc"
              ? t("collection.sort.ascending", { field: field.label })
              : direction === "desc"
                ? t("collection.sort.descending", { field: field.label })
                : field.label,
          selected: direction !== null,
          sortKeyOnPress: nextCardSortKeyForField(selectedSort, field.field),
        };
      }),
  ];
}
