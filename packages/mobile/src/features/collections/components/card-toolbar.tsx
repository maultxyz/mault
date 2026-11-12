import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { SEARCH_INPUT_HEIGHT } from "@/lib/constants/ui";
import type { CardToolbarProps } from "@/lib/interfaces/collections";

export function CardToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAccessibilityLabel,
  activeSortAndFilterCount,
  onOpenViewOptions,
}: CardToolbarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <SearchInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          accessibilityLabel={searchAccessibilityLabel}
        />
      </View>
      <View>
        <IconButton
          icon="filter"
          size={SEARCH_INPUT_HEIGHT}
          accessibilityLabel={
            activeSortAndFilterCount > 0
              ? `${t("collection.viewOptions")}, ${activeSortAndFilterCount}`
              : t("collection.viewOptions")
          }
          onPress={onOpenViewOptions}
        />
        {activeSortAndFilterCount > 0 ? (
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
              {String(activeSortAndFilterCount)}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
