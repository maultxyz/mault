import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CalloutProps } from "@/lib/interfaces/ui";

export function Callout({ tone = "info", title, description, action }: CalloutProps) {
  const colors = useTheme();
  const palette = {
    info: { bg: colors.infoMuted, border: colors.infoBorder, fg: colors.infoForeground, icon: "info" },
    success: { bg: colors.successMuted, border: colors.successBorder, fg: colors.successForeground, icon: "success" },
    warning: { bg: colors.warningMuted, border: colors.warningBorder, fg: colors.warningForeground, icon: "warning" },
    destructive: { bg: colors.destructiveMuted, border: colors.destructiveBorder, fg: colors.destructive, icon: "error" },
  } as const;
  const { bg, border, fg, icon } = palette[tone];

  return (
    <View
      accessibilityRole={tone === "destructive" || tone === "warning" ? "alert" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        backgroundColor: bg,
        borderColor: border,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <Icon name={icon} size={16} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText size="xs" weight="medium" style={{ color: fg }}>
          {title}
        </AppText>
        {description ? (
          <AppText size="xs" style={{ color: fg }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
    </View>
  );
}
