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
        flexGrow: 1,
        flexBasis: "45%",
        minWidth: 0,
        padding: SPACING.md,
        gap: 2,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
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
