import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { ListRowProps } from "@/lib/interfaces/ui";

export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  value,
  tone = "default",
  right,
  onPress,
  disabled = false,
  selected,
}: ListRowProps) {
  const colors = useTheme();
  const destructive = tone === "destructive";
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ disabled, selected: selected ?? undefined }}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: selected ? colors.primaryMuted : pressed ? colors.muted : "transparent",
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      {leading ?? (icon ? <IconBadge name={icon} tone={destructive ? "destructive" : "neutral"} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="base" weight="medium" numberOfLines={1} style={destructive ? { color: colors.destructive } : selected ? { color: colors.primaryText } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size="xs" tone="secondary" numberOfLines={2}>
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
}
