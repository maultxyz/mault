import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
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
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: action.isPrimary ? colors.onBrandSurface : colors.primaryMuted,
            }}
          >
            <Icon name={action.icon} size={20} color={action.isPrimary ? colors.primaryForeground : colors.primaryText} />
          </View>
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
