import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { SwipeRowActions } from "@/components/ui/swipe-row-actions";
import { longPressProps } from "@/lib/long-press";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE, LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { HomeCollectionRowProps } from "@/lib/interfaces/ui";

export function HomeCollectionRow({
  name,
  subtitle,
  value,
  isScanTarget,
  isLive = false,
  onPress,
  onPressIn,
  onLongPress,
  longPressLabel,
  swipeDestructiveAction,
}: HomeCollectionRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const longPressHandlers = longPressProps(onLongPress, longPressLabel);
  return (
    <SwipeRowActions
      moreAction={onLongPress ? { label: longPressLabel ?? t("listRow.moreActions"), onPress: onLongPress } : undefined}
      destructiveAction={swipeDestructiveAction}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={onPress}
        onPressIn={onPressIn}
        {...longPressHandlers}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.md,
          minHeight: LIST_ROW_MIN_HEIGHT,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          backgroundColor: pressed ? colors.tonal : "transparent",
        })}
      >
        <IconBadge
          name={isLive ? "live" : isScanTarget ? "scan" : "collections"}
          tone={isLive ? "warning" : isScanTarget ? "primary" : "neutral"}
          size={LIST_ROW_ICON_SIZE}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="medium" numberOfLines={1}>
            {name}
          </AppText>
          <AppText size="xs" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        {value ? (
          <AppText weight="semibold" numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </Pressable>
    </SwipeRowActions>
  );
}
