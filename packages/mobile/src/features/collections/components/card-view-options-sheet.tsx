import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FilterChip } from "@/features/collections/components/filter-chip";
import { CARD_VIEW_MODES, COLLECTION_SCAN_TIMELINE_OPTIONS } from "@/lib/constants/collections";
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
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button style={{ flex: 1 }} variant="secondary" label={t("collection.filters.reset")} onPress={() => onChange(EMPTY_CARD_FILTERS)} />
          <Button style={{ flex: 1 }} label={t("common.done")} onPress={onClose} />
        </View>
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
