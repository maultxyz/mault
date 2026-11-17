import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { HomeStatTileProps } from "@/lib/interfaces/ui";

export function HomeStatTile({ label, value }: HomeStatTileProps) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
      }}
    >
      <AppText size="lg" weight="semibold" numberOfLines={1} style={{ lineHeight: 22, fontVariant: ["tabular-nums"] }}>
        {value}
      </AppText>
      <AppText size="2xs" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}
