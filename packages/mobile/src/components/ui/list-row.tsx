import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { SwipeRowActions } from "@/components/ui/swipe-row-actions";
import { longPressProps } from "@/lib/long-press";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, LIST_ROW_ICON_SIZE, LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { ListRowProps } from "@/lib/interfaces/ui";

export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  value,
  tone = "default",
  right,
  rightIsInteractive = false,
  onPress,
  onLongPress,
  longPressLabel,
  disabled = false,
  selected,
  subtitleNumberOfLines = 2,
  swipeDestructiveAction,
}: ListRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const destructive = tone === "destructive";
  const longPressHandlers = longPressProps(onLongPress, longPressLabel);
  const row = (
    <Pressable
      accessible={!rightIsInteractive}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ disabled, selected: selected ?? undefined }}
      disabled={(!onPress && !onLongPress) || disabled}
      onPress={onPress}
      {...longPressHandlers}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: SPACING.sm,
        backgroundColor: selected ? colors.primarySelected : pressed ? colors.tonal : "transparent",
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      {leading ?? (icon ? <IconBadge name={icon} tone={destructive ? "destructive" : "neutral"} size={LIST_ROW_ICON_SIZE} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="medium" numberOfLines={1} style={destructive ? { color: colors.destructive } : selected ? { color: colors.primaryText } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size="xs" tone="secondary" numberOfLines={subtitleNumberOfLines}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText tone="secondary" numberOfLines={1} style={{ flexShrink: 0, maxWidth: "50%" }}>
          {value}
        </AppText>
      ) : null}
      {right}
      {selected ? <Icon name="check" size={16} color={colors.primaryText} /> : null}
      {onPress && selected == null && !right && !destructive ? (
        <Icon name="chevron" size={16} color={colors.foregroundSecondary} />
      ) : null}
    </Pressable>
  );
  if (disabled) return row;
  return (
    <SwipeRowActions
      moreAction={onLongPress ? { label: longPressLabel ?? t("listRow.moreActions"), onPress: onLongPress } : undefined}
      destructiveAction={swipeDestructiveAction}
    >
      {row}
    </SwipeRowActions>
  );
}
