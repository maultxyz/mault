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
    neutral: { bg: colors.background, pressed: colors.muted, fg: colors.foreground, border: colors.border },
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.primaryForeground, border: "transparent" },
    plain: { bg: "transparent", pressed: colors.muted, fg: colors.foreground, border: "transparent" },
    camera: { bg: colors.cameraScrim, pressed: colors.cameraScrim, fg: colors.onCamera, border: "transparent" },
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
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? palette.pressed : palette.bg,
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={palette.fg} />
    </Pressable>
  );
}
