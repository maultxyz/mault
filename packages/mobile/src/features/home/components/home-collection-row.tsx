import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { HomeCollectionRowProps } from "@/lib/interfaces/ui";

export function HomeCollectionRow({ name, subtitle, value, isActive, isLive = false, onPress }: HomeCollectionRowProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
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
        name={isLive ? "live" : isActive ? "scan" : "collections"}
        tone={isLive ? "warning" : isActive ? "primary" : "neutral"}
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
