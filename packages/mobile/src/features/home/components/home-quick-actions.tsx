import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";
import type { HomeQuickActionsProps } from "@/lib/interfaces/home";

export function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: SPACING.sm }}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            alignItems: "center",
            gap: SPACING.sm,
            paddingVertical: SPACING.lg,
            paddingHorizontal: SPACING.xs,
            borderRadius: SURFACE_RADIUS,
            borderCurve: "continuous",
            backgroundColor: action.isPrimary ? colors.primary : colors.card,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          {action.isPrimary ? (
            <View
              style={{
                width: ICON_BADGE_SIZE,
                height: ICON_BADGE_SIZE,
                borderRadius: RADIUS.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.onBrandSurface,
              }}
            >
              <Icon name={action.icon} size={Math.round(ICON_BADGE_SIZE * 0.48)} color={colors.primaryForeground} />
            </View>
          ) : (
            <IconBadge name={action.icon} tone="primary" />
          )}
          <AppText
            size="xs"
            weight="semibold"
            numberOfLines={2}
            style={{ textAlign: "center", color: action.isPrimary ? colors.primaryForeground : colors.foreground }}
          >
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
