import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { ShutterButtonProps } from "@/lib/interfaces/ui";

export function ShutterButton({ running, label, onPress, disabled = false }: ShutterButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 76,
        height: 76,
        borderRadius: RADIUS.full,
        borderWidth: 4,
        borderColor: colors.onCamera,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? DISABLED_OPACITY : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: RADIUS.full,
          backgroundColor: running ? colors.destructive : colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={running ? "pause" : "play"} size={26} color={colors.onCamera} />
      </View>
    </Pressable>
  );
}
