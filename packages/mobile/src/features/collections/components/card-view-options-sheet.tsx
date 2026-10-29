import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { FilterChip } from "@/features/collections/components/filter-chip";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { CardViewOptionsSheetProps } from "@/lib/interfaces/collections";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function CardViewOptionsSheet({
  visible,
  grouped,
  onGroupedChange,
  sortOptions,
  selectedSort,
  onSortChange,
  filters,
  breakdown,
  binCount,
  onChange,
  onClose,
}: CardViewOptionsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const bins = Array.from({ length: binCount }, (_, i) => i + 1);

  const section = (title: string, children: ReactNode) => (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold">
        {title}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>{children}</View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          maxHeight: "85%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
          <AppText size="lg" heading weight="bold" style={{ flex: 1 }}>
            {t("collection.viewOptions")}
          </AppText>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.xl, paddingBottom: SPACING.lg }}>
          {section(t("collection.display"), [
            <FilterChip
              key="grouped"
              label={t("collection.groupDuplicates")}
              selected={grouped}
              onPress={() => onGroupedChange(!grouped)}
            />,
          ])}
          {section(
            t("collection.sort.title"),
            sortOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={option.value === selectedSort}
                onPress={() => onSortChange(option.value)}
              />
            )),
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
          {section(
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
          )}
          {section(t("collection.filters.status"), [
            <FilterChip
              key="review"
              label={t("collection.filters.needsReview")}
              selected={filters.needsAttention}
              onPress={() => onChange({ ...filters, needsAttention: !filters.needsAttention })}
            />,
            <FilterChip
              key="downloaded"
              label={t("collection.filters.showDownloaded")}
              selected={filters.showDownloaded}
              onPress={() => onChange({ ...filters, showDownloaded: !filters.showDownloaded })}
            />,
          ])}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm }}>
          <Button style={{ flex: 1 }} variant="secondary" label={t("collection.filters.reset")} onPress={() => onChange(EMPTY_CARD_FILTERS)} />
          <Button style={{ flex: 1 }} label={t("common.done")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
