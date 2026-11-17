import { DEFAULT_CARD_SORT, SORTABLE_FIELD_TYPES, type CardFilters, type FieldMeta } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import type { CardSortOption } from "@/lib/interfaces/collections";

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

export function cardSortOptions(fieldDefinitions: FieldMeta[], defaultSortLabel: string, t: TFunction): CardSortOption[] {
  return [
    { value: DEFAULT_CARD_SORT, label: defaultSortLabel },
    ...fieldDefinitions
      .filter((field) => SORTABLE_FIELD_TYPES.includes(field.type))
      .flatMap((field) => [
        { value: `${field.field}-asc`, label: t("collection.sort.ascending", { field: field.label }) },
        { value: `${field.field}-desc`, label: t("collection.sort.descending", { field: field.label }) },
      ]),
  ];
}
