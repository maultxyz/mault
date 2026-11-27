import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  isCardCondition,
  LANGUAGE_LABELS,
  PUBLIC_CARD_FINISHES,
  PUBLIC_CARD_PRICE_SORTS,
  PUBLIC_CARD_SORTS,
  type PublicCardFacetCount,
  type PublicCardFilters,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FilterChip } from "@/features/collections/components/filter-chip";
import { SET_FILTER_CHIPS_MAX } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { SharedLinkFilterSheetProps } from "@/lib/interfaces/share-links";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function SharedLinkFilterSheet({
  visible,
  facets,
  showsPrices,
  sort,
  filters,
  onSortChange,
  onFiltersChange,
  onClose,
}: SharedLinkFilterSheetProps) {
  const { t } = useTranslation();
  const withCount = (label: string, count: number) => t("collection.filters.optionWithCount", { label, count });
  const sorts = PUBLIC_CARD_SORTS.filter(
    (option) => showsPrices || !(PUBLIC_CARD_PRICE_SORTS as readonly string[]).includes(option),
  );
  const finishCounts = { all: undefined, foil: facets?.foilCount, nonfoil: facets?.nonFoilCount };

  const section = (title: string, children: ReactNode) => (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold">
        {title}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>{children}</View>
    </View>
  );
  const facetSection = (
    title: string,
    key: "rarities" | "colors" | "foilTypes" | "conditions" | "languages",
    options: PublicCardFacetCount[] | undefined,
    labelOf: (value: string) => string,
  ) =>
    options && options.length > 0
      ? section(
          title,
          options.map((option) => (
            <FilterChip
              key={option.key}
              label={withCount(labelOf(option.key), option.count)}
              selected={filters[key].includes(option.key)}
              onPress={() => onFiltersChange({ ...filters, [key]: toggle(filters[key], option.key) } as PublicCardFilters)}
            />
          )),
        )
      : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("sharedLink.filters.title")}
      contentContainerStyle={{ gap: SPACING.xl }}
      footer={
        <Button
          variant="secondary"
          label={t("collection.filters.reset")}
          onPress={() => {
            onSortChange(DEFAULT_PUBLIC_CARD_SORT);
            onFiltersChange(EMPTY_PUBLIC_CARD_FILTERS);
          }}
        />
      }
    >
      {section(
        t("collection.sort.title"),
        sorts.map((option) => (
          <FilterChip
            key={option}
            label={t(`sharedLink.filters.sorts.${option}`)}
            selectionRole="radio"
            selected={sort === option}
            onPress={() => onSortChange(option)}
          />
        )),
      )}
      {section(
        t("collection.filters.finish"),
        PUBLIC_CARD_FINISHES.map((finish) => (
          <FilterChip
            key={finish}
            label={
              finishCounts[finish] === undefined
                ? t(`collection.filters.finishes.${finish}`)
                : withCount(t(`collection.filters.finishes.${finish}`), finishCounts[finish])
            }
            selectionRole="radio"
            selected={filters.finish === finish}
            onPress={() => onFiltersChange({ ...filters, finish })}
          />
        )),
      )}
      {facetSection(t("collection.filters.rarity"), "rarities", facets?.rarities, (value) => value)}
      {facetSection(t("collection.filters.colors"), "colors", facets?.colors, (value) => value)}
      {facetSection(t("collection.filters.foil"), "foilTypes", facets?.foilTypes, (value) => value)}
      {facetSection(t("collection.filters.condition"), "conditions", facets?.conditions, (value) =>
        isCardCondition(value) ? t(`cardDetail.conditions.${value}`) : value,
      )}
      {facetSection(t("collection.filters.language"), "languages", facets?.languages, (value) => LANGUAGE_LABELS[value] ?? value)}
      {facets && facets.sets.length > 0
        ? section(
            t("collection.filters.sets"),
            facets.sets.slice(0, Math.max(SET_FILTER_CHIPS_MAX, filters.sets.length)).map((set) => (
              <FilterChip
                key={set.code}
                label={withCount(set.name || set.code, set.count)}
                selected={filters.sets.includes(set.code)}
                onPress={() => onFiltersChange({ ...filters, sets: toggle(filters.sets, set.code) })}
              />
            )),
          )
        : null}
    </Sheet>
  );
}
