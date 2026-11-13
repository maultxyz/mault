import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";
import type { IconBadgeProps } from "@/lib/interfaces/ui";

export function IconBadge({ name, tone = "neutral", size = ICON_BADGE_SIZE }: IconBadgeProps) {
  const colors = useTheme();
  const palette = {
    neutral: { bg: colors.muted, fg: colors.foreground },
    primary: { bg: colors.primaryMuted, fg: colors.primaryText },
    destructive: { bg: colors.destructiveTint, fg: colors.destructive },
    success: { bg: colors.successMuted, fg: colors.successForeground },
    warning: { bg: colors.warningMuted, fg: colors.warningForeground },
  }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.full,
        backgroundColor: palette.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={Math.round(size * 0.48)} color={palette.fg} />
    </View>
  );
}
