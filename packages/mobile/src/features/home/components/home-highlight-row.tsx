import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { HomeHighlightRowProps } from "@/lib/interfaces/home";

export function HomeHighlightRow({ icon, tone, title, description, actionLabel, onPress }: HomeHighlightRowProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${description}`}
      accessibilityHint={actionLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        padding: SPACING.lg,
        borderRadius: SURFACE_RADIUS,
        borderCurve: "continuous",
        backgroundColor: colors.card,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <IconBadge name={icon} tone={tone} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={2}>
          {description}
        </AppText>
      </View>
      <Icon name="chevron" size={18} color={colors.foregroundSecondary} />
    </Pressable>
  );
}
