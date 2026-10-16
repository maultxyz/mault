import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { PillProps } from "@/lib/interfaces/ui";

export function Pill({ label, tone = "neutral", icon }: PillProps) {
  const colors = useTheme();
  const palette = {
    neutral: { bg: colors.inputBackground, border: colors.border, fg: colors.foreground },
    info: { bg: colors.infoMuted, border: "transparent", fg: colors.infoForeground },
    success: { bg: colors.successMuted, border: "transparent", fg: colors.successForeground },
    warning: { bg: colors.warningMuted, border: "transparent", fg: colors.warningForeground },
    destructive: { bg: colors.destructiveTint, border: "transparent", fg: colors.destructive },
  }[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        height: 20,
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      {icon ? <Icon name={icon} size={10} color={palette.fg} /> : null}
      <AppText size="2xs" weight="medium" style={{ color: palette.fg, lineHeight: 14 }}>
        {label}
      </AppText>
    </View>
  );
}
