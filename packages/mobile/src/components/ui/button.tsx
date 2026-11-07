import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS, DISABLED_OPACITY, MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { ButtonProps } from "@/lib/interfaces/ui";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  size = "md",
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const colors = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.primaryForeground, border: "transparent" },
    secondary: { bg: colors.tonal, pressed: colors.tonalPressed, fg: colors.foreground, border: "transparent" },
    destructive: { bg: colors.destructiveTint, pressed: colors.destructiveMuted, fg: colors.destructiveForeground, border: "transparent" },
    ghost: { bg: "transparent", pressed: colors.muted, fg: colors.foreground, border: "transparent" },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === "sm" ? (MIN_TOUCH_TARGET - BUTTON_HEIGHTS.sm) / 2 : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: BUTTON_HEIGHTS[size],
          paddingHorizontal: size === "sm" ? SPACING.md + 2 : SPACING.xl,
          borderRadius: RADIUS.md,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: inactive ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs + 2 }}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : icon ? (
          <Icon name={icon} size={iconOnly ? 20 : 16} color={palette.fg} />
        ) : null}
        {iconOnly ? null : (
          <AppText size={size === "lg" ? "base" : "sm"} weight="semibold" style={{ color: palette.fg }}>
            {label}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}
