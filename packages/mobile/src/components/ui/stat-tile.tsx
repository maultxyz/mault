import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { StatTileProps } from "@/lib/interfaces/ui";

export function StatTile({ label, value, hint }: StatTileProps) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        width: "50%",
        minWidth: 0,
        padding: SPACING.md,
        gap: 2,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      <AppText size="xs" tone="secondary">
        {label}
      </AppText>
      <AppText size="xl" heading weight="bold" numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </AppText>
      {hint ? (
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
