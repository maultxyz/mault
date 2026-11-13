import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { BADGE_RADIUS, SPACING } from "@/lib/constants/theme";
import { PILL_MIN_HEIGHT, PILL_STATUS_LETTER_SPACING } from "@/lib/constants/ui";
import type { PillProps } from "@/lib/interfaces/ui";

export function Pill({ label, tone = "neutral", icon }: PillProps) {
  const colors = useTheme();
  const palette = {
    neutral: { bg: colors.tonal, border: "transparent", fg: colors.foreground },
    info: { bg: colors.infoMuted, border: "transparent", fg: colors.infoForeground },
    success: { bg: colors.successMuted, border: "transparent", fg: colors.successForeground },
    warning: { bg: colors.warningMuted, border: "transparent", fg: colors.warningForeground },
    destructive: { bg: colors.destructiveTint, border: "transparent", fg: colors.destructive },
    primary: { bg: colors.primary, border: "transparent", fg: colors.primaryForeground },
  }[tone];
  const isStatusTone = tone !== "neutral";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        minHeight: PILL_MIN_HEIGHT,
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BADGE_RADIUS,
        borderWidth: 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      {icon ? <Icon name={icon} size={10} color={palette.fg} /> : null}
      <AppText
        size="2xs"
        weight={isStatusTone ? "semibold" : "medium"}
        style={[
          { color: palette.fg, lineHeight: 14 },
          isStatusTone ? { textTransform: "uppercase", letterSpacing: PILL_STATUS_LETTER_SPACING } : null,
        ]}
      >
        {label}
      </AppText>
    </View>
  );
}
