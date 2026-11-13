import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { StatTileProps } from "@/lib/interfaces/ui";

export function StatTile({ label, value, hint, icon }: StatTileProps) {
  const colors = useTheme();
  return (
    <View style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
      <View
        accessible
        accessibilityLabel={[`${label}: ${value}`, hint].filter(Boolean).join(", ")}
        style={{
          flex: 1,
          minWidth: 0,
          padding: SPACING.lg,
          gap: SPACING.md,
          borderRadius: SURFACE_RADIUS,
          borderCurve: "continuous",
          backgroundColor: colors.card,
        }}
      >
        {icon ? <IconBadge name={icon} tone="primary" /> : null}
        <View style={{ gap: 2 }}>
          <AppText size="xs" tone="secondary" numberOfLines={1}>
            {label}
          </AppText>
          <AppText size="2xl" heading weight="bold" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </AppText>
          {hint ? (
            <AppText size="xs" tone="secondary" numberOfLines={1}>
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}
