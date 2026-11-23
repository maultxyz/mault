import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  CARD_CONDITIONS,
  EMPTY_CARD_FILTERS,
  isCardCondition,
  LANGUAGE_LABELS,
  PRICE_SOURCE_FIELDS,
  PUBLIC_CARD_FINISHES,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet } from "@/components/ui/sheet";
import { CardPriceRangeFields } from "@/features/collections/components/card-price-range-fields";
import { usePricing } from "@/hooks/use-pricing";
import { FilterChip } from "@/features/collections/components/filter-chip";
import {
  CARD_VIEW_MODES,
  COLLECTION_SCAN_TIMELINE_OPTIONS,
  SET_FILTER_CHIPS_MAX,
  SET_FILTER_SEARCH_MIN_COUNT,
} from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { CardViewOptionsSheetProps } from "@/lib/interfaces/collections";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function CardViewOptionsSheet({
  visible,
  viewMode,
  onViewModeChange,
  grouped,
  onGroupedChange,
  scanTimeline,
  onScanTimelineChange,
  sortOptions,
  onSortChange,
  filters,
  breakdown,
  binCount,
  onChange,
  onClose,
}: CardViewOptionsSheetProps) {
  const { t } = useTranslation();
  const scanTimelineIsOn = !!scanTimeline && scanTimeline !== "off";
  const bins = Array.from({ length: binCount ?? 0 }, (_, i) => i + 1);
  const pricing = usePricing();
  const [setQuery, setSetQuery] = useState("");
  const withCount = (label: string, count: number | undefined) =>
    count === undefined ? label : t("collection.filters.optionWithCount", { label, count });
  const conditionOptions = [...(breakdown?.conditions ?? [])].sort(
    (left, right) =>
      CARD_CONDITIONS.indexOf(left.key as (typeof CARD_CONDITIONS)[number]) -
      CARD_CONDITIONS.indexOf(right.key as (typeof CARD_CONDITIONS)[number]),
  );
  const finishCounts = { all: undefined, foil: breakdown?.foilCount, nonfoil: breakdown?.nonFoilCount };
  const normalizedSetQuery = setQuery.trim().toLowerCase();
  const setOptions = (breakdown?.sets ?? []).filter(({ code }) => !!code);
  const matchingSets = setOptions.filter(
    ({ code, name }) =>
      filters.sets.includes(code) ||
      !normalizedSetQuery ||
      (name || code).toLowerCase().includes(normalizedSetQuery) ||
      code.toLowerCase().includes(normalizedSetQuery),
  );
  const shownSets = [
    ...matchingSets.filter(({ code }) => filters.sets.includes(code)),
    ...matchingSets.filter(({ code }) => !filters.sets.includes(code)),
  ].slice(0, Math.max(SET_FILTER_CHIPS_MAX, filters.sets.length));

  const section = (title: string, children: ReactNode) => (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold">
        {title}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>{children}</View>
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("collection.viewOptions")}
      contentContainerStyle={{ gap: SPACING.xl }}
      footer={
        <Button variant="secondary" label={t("collection.filters.reset")} onPress={() => onChange(EMPTY_CARD_FILTERS)} />
      }
    >
      {onViewModeChange
        ? section(
            t("collection.layout"),
            CARD_VIEW_MODES.map((mode) => (
              <FilterChip
                key={mode}
                label={t(`collection.viewModes.${mode}`)}
                selected={viewMode === mode}
                onPress={() => onViewModeChange(mode)}
              />
            )),
          )
        : null}
      {onScanTimelineChange
        ? section(
            t("collection.scanTimeline"),
            COLLECTION_SCAN_TIMELINE_OPTIONS.map((option) => (
              <FilterChip
                key={option}
                label={t(`collection.scanTimelineOptions.${option}`)}
                selected={(scanTimeline ?? "off") === option}
                onPress={() => onScanTimelineChange(option)}
              />
            )),
          )
        : null}
      {onGroupedChange && !scanTimelineIsOn
        ? section(t("collection.display"), [
            <FilterChip
              key="grouped"
              label={t("collection.groupDuplicates")}
              selected={!!grouped}
              onPress={() => onGroupedChange(!grouped)}
            />,
          ])
        : null}
      {scanTimelineIsOn ? (
        <View style={{ gap: SPACING.sm }}>
          <AppText size="sm" weight="semibold">
            {t("collection.sort.title")}
          </AppText>
          <AppText size="sm" tone="secondary">
            {t("collection.scanTimelineSortNote")}
          </AppText>
        </View>
      ) : (
        section(
          t("collection.sort.title"),
          sortOptions.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={option.selected}
              onPress={() => onSortChange(option.sortKeyOnPress)}
            />
          )),
        )
      )}
      {breakdown && breakdown.colors.length > 0
        ? section(
            t("collection.filters.colors"),
            breakdown.colors.map((color) => (
              <FilterChip
                key={color.key}
                label={color.label}
                swatch={color.color}
                selected={filters.colors.includes(color.key)}
                onPress={() => onChange({ ...filters, colors: toggle(filters.colors, color.key) })}
              />
            )),
          )
        : null}
      {breakdown && breakdown.rarities.length > 0
        ? section(
            t("collection.filters.rarity"),
            breakdown.rarities.map((rarity) => (
              <FilterChip
                key={rarity.key}
                label={rarity.label}
                swatch={rarity.color}
                selected={filters.rarities.includes(rarity.key)}
                onPress={() => onChange({ ...filters, rarities: toggle(filters.rarities, rarity.key) })}
              />
            )),
          )
        : null}
      {breakdown && breakdown.foilTypes.length > 0
        ? section(
            t("collection.filters.foil"),
            breakdown.foilTypes.map((foil) => (
              <FilterChip
                key={foil.key}
                label={foil.label}
                selected={filters.foilTypes.includes(foil.key)}
                onPress={() => onChange({ ...filters, foilTypes: toggle(filters.foilTypes, foil.key) })}
              />
            )),
          )
        : null}
      {breakdown
        ? section(
            t("collection.filters.finish"),
            PUBLIC_CARD_FINISHES.map((finish) => (
              <FilterChip
                key={finish}
                label={withCount(t(`collection.filters.finishes.${finish}`), finishCounts[finish])}
                selectionRole="radio"
                selected={filters.finish === finish}
                onPress={() => onChange({ ...filters, finish })}
              />
            )),
          )
        : null}
      {conditionOptions.length > 0
        ? section(
            t("collection.filters.condition"),
            conditionOptions.map(({ key, count }) => (
              <FilterChip
                key={key}
                label={withCount(isCardCondition(key) ? t(`cardDetail.conditions.${key}`) : key, count)}
                selected={filters.conditions.includes(key)}
                onPress={() => onChange({ ...filters, conditions: toggle(filters.conditions, key) })}
              />
            )),
          )
        : null}
      {breakdown && (breakdown.languages.length > 1 || filters.languages.length > 0)
        ? section(
            t("collection.filters.language"),
            breakdown.languages.map(({ key, count }) => (
              <FilterChip
                key={key}
                label={withCount(LANGUAGE_LABELS[key] ?? key, count)}
                selected={filters.languages.includes(key)}
                onPress={() => onChange({ ...filters, languages: toggle(filters.languages, key) })}
              />
            )),
          )
        : null}
      {breakdown ? (
        <View style={{ gap: SPACING.sm }}>
          <AppText size="sm" weight="semibold">
            {t("collection.filters.price", { currency: PRICE_SOURCE_FIELDS[pricing.source].currency })}
          </AppText>
          <CardPriceRangeFields
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onChange={(range) => onChange({ ...filters, ...range })}
          />
        </View>
      ) : null}
      {setOptions.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <AppText size="sm" weight="semibold">
            {t("collection.filters.sets")}
          </AppText>
          {setOptions.length > SET_FILTER_SEARCH_MIN_COUNT ? (
            <SearchInput
              value={setQuery}
              onChangeText={setSetQuery}
              placeholder={t("collection.filters.findSet")}
              accessibilityLabel={t("collection.filters.findSet")}
            />
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {shownSets.map(({ code, name, count }) => (
              <FilterChip
                key={code}
                label={withCount(name || code, count)}
                selected={filters.sets.includes(code)}
                onPress={() => onChange({ ...filters, sets: toggle(filters.sets, code) })}
              />
            ))}
          </View>
          {matchingSets.length > shownSets.length ? (
            <AppText size="sm" tone="secondary">
              {t("collection.filters.setsShown", { shown: shownSets.length, count: matchingSets.length })}
            </AppText>
          ) : matchingSets.length === 0 ? (
            <AppText size="sm" tone="secondary">
              {t("collection.filters.noSetMatches")}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {binCount == null
        ? null
        : section(
          t("collection.filters.bin"),
          [
            ...bins.map((bin) => (
              <FilterChip
                key={bin}
                label={String(bin)}
                selected={filters.bins.includes(bin)}
                onPress={() => onChange({ ...filters, bins: toggle<number | null>(filters.bins, bin) })}
              />
            )),
            <FilterChip
              key="none"
              label={t("collection.filters.noBin")}
              selected={filters.bins.includes(null)}
              onPress={() => onChange({ ...filters, bins: toggle<number | null>(filters.bins, null) })}
            />,
          ],
        )
      }
      {section(t("collection.filters.status"), [
        <FilterChip
          key="review"
          label={t("collection.filters.needsReview")}
          selected={filters.needsAttention}
          onPress={() => onChange({ ...filters, needsAttention: !filters.needsAttention })}
        />,
        <FilterChip
          key="downloaded"
          label={t("collection.filters.hideDownloaded")}
          selected={filters.hideDownloaded}
          onPress={() => onChange({ ...filters, hideDownloaded: !filters.hideDownloaded })}
        />,
      ])}
    </Sheet>
  );
}
