import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { FilterChip } from "@/features/collections/components/filter-chip";
import { useTheme } from "@/hooks/use-theme";
import { CARD_GRID_GUTTER } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardToolbarProps } from "@/lib/interfaces/collections";

export function CardToolbar({
  sortLabel,
  activeFilterCount,
  grouped,
  needsReview,
  onOpenSort,
  onOpenFilters,
  onToggleGrouped,
  onToggleNeedsReview,
}: CardToolbarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -CARD_GRID_GUTTER }}
      contentContainerStyle={{ paddingHorizontal: CARD_GRID_GUTTER, gap: SPACING.sm, alignItems: "center" }}
    >
      <IconButton icon="sort" size={36} accessibilityLabel={sortLabel} onPress={onOpenSort} />
      <View>
        <IconButton icon="filter" size={36} accessibilityLabel={t("collection.filters.title")} onPress={onOpenFilters} />
        {activeFilterCount > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: RADIUS.full,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText size="2xs" weight="bold" style={{ color: colors.primaryForeground, lineHeight: 14 }}>
              {String(activeFilterCount)}
            </AppText>
          </View>
        ) : null}
      </View>
      <FilterChip label={t("collection.groupDuplicates")} selected={grouped} onPress={onToggleGrouped} />
      <FilterChip label={t("collection.filters.needsReview")} selected={needsReview} onPress={onToggleNeedsReview} />
    </ScrollView>
  );
}
