import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { StatTileProps } from "@/lib/interfaces/ui";

export function StatTile({ label, value, exactValue, hint, icon, onPress }: StatTileProps) {
  const colors = useTheme();
  const accessibilityLabel = [`${label}: ${exactValue ?? value}`, hint].filter(Boolean).join(", ");
  const tileStyle = {
    flex: 1,
    minWidth: 0,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderRadius: SURFACE_RADIUS,
    borderCurve: "continuous",
    backgroundColor: colors.card,
  } as const;
  const content = (
    <>
      {icon || onPress ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {icon ? <IconBadge name={icon} tone="primary" /> : <View />}
          {onPress ? <Icon name="chevron" size={18} color={colors.foregroundSecondary} /> : null}
        </View>
      ) : null}
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
    </>
  );
  return (
    <View style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          style={({ pressed }) => ({ ...tileStyle, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          {content}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={accessibilityLabel} style={tileStyle}>
          {content}
        </View>
      )}
    </View>
  );
}
