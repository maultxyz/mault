import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";
import type { InitialBadgeProps } from "@/lib/interfaces/ui";

export function InitialBadge({ initials, tone = "neutral", size = ICON_BADGE_SIZE }: InitialBadgeProps) {
  const colors = useTheme();
  const palette = {
    neutral: { bg: colors.muted, fg: colors.foreground },
    primary: { bg: colors.primaryMuted, fg: colors.primaryText },
    solid: { bg: colors.primary, fg: colors.primaryForeground },
  }[tone];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.full,
        backgroundColor: palette.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText size={size >= 48 ? "lg" : "sm"} weight="bold" style={{ color: palette.fg }}>
        {initials}
      </AppText>
    </View>
  );
}
