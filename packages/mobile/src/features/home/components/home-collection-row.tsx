import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { longPressProps } from "@/lib/long-press";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { HomeCollectionRowProps } from "@/lib/interfaces/ui";

export function HomeCollectionRow({ name, subtitle, value, isScanTarget, isLive = false, onPress, onLongPress, longPressLabel }: HomeCollectionRowProps) {
  const colors = useTheme();
  const longPressHandlers = longPressProps(onLongPress, longPressLabel);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      {...longPressHandlers}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT + 8,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <IconBadge
        name={isLive ? "live" : isScanTarget ? "scan" : "collections"}
        tone={isLive ? "warning" : isScanTarget ? "primary" : "neutral"}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="base" weight="semibold" numberOfLines={1}>
          {name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {value ? (
        <AppText size="base" weight="semibold" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </AppText>
      ) : null}
    </Pressable>
  );
}
