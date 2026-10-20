import { Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { DISABLED_OPACITY, SHUTTER_ICON_SIZE, SHUTTER_SIZE } from "@/lib/constants/ui";
import type { ShutterButtonProps } from "@/lib/interfaces/ui";

export function ShutterButton({ running, icon, label, onPress, disabled = false }: ShutterButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: SHUTTER_SIZE,
        height: SHUTTER_SIZE,
        borderRadius: RADIUS.full,
        backgroundColor: running ? colors.destructive : colors.primary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? DISABLED_OPACITY : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Icon name={icon} size={SHUTTER_ICON_SIZE} color={colors.onCamera} />
    </Pressable>
  );
}
