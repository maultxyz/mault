import { Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, PAGE_HEADER_ICON_BUTTON_SIZE } from "@/lib/constants/ui";
import type { IconButtonProps } from "@/lib/interfaces/ui";

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "neutral",
  size = PAGE_HEADER_ICON_BUTTON_SIZE,
  disabled = false,
}: IconButtonProps) {
  const colors = useTheme();
  const palette = {
    neutral: { bg: colors.muted, pressed: colors.border, fg: colors.foreground },
    primary: { bg: colors.primary, pressed: colors.primary, fg: colors.primaryForeground },
    plain: { bg: "transparent", pressed: colors.muted, fg: colors.foreground },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={SPACING.xs}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? palette.pressed : palette.bg,
        opacity: disabled ? DISABLED_OPACITY : pressed && variant === "primary" ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={palette.fg} />
    </Pressable>
  );
}
