import { Text } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { FONT_FAMILY, FONT_SIZE } from "@/lib/constants/theme";
import type { AppTextProps } from "@/lib/interfaces/ui";

export function AppText({
  size = "sm",
  tone = "default",
  weight = "regular",
  mono = false,
  heading = false,
  style,
  ...props
}: AppTextProps) {
  const colors = useTheme();
  const color = {
    default: colors.foreground,
    secondary: colors.foregroundSecondary,
    primary: colors.primaryText,
    info: colors.infoForeground,
    success: colors.successForeground,
    warning: colors.warningForeground,
    destructive: colors.destructiveForeground,
    inverse: colors.primaryForeground,
  }[tone];
  const fontFamily = mono
    ? FONT_FAMILY.mono
    : heading
      ? weight === "medium" || weight === "regular"
        ? FONT_FAMILY.headingMedium
        : FONT_FAMILY.headingSemibold
      : FONT_FAMILY[weight];
  return (
    <Text
      {...props}
      style={[
        {
          color,
          fontSize: FONT_SIZE[size],
          lineHeight: Math.round(FONT_SIZE[size] * (heading ? 1.2 : 1.45)),
          letterSpacing: heading ? (FONT_SIZE[size] >= FONT_SIZE.xl ? -0.6 : -0.2) : 0,
          fontFamily,
        },
        style,
      ]}
    />
  );
}
