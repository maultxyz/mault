import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { StatTileProps } from "@/lib/interfaces/ui";

export function StatTile({ label, value, hint }: StatTileProps) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        minWidth: 140,
        padding: SPACING.md,
        gap: SPACING.xs,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.cardRing,
        backgroundColor: colors.card,
      }}
    >
      <AppText size="xs" tone="secondary">
        {label}
      </AppText>
      <AppText size="xl" heading style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </AppText>
      {hint ? (
        <AppText size="2xs" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
