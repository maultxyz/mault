import { Pressable } from "react-native";
import { Pill } from "@/components/ui/pill";
import { MIN_TOUCH_TARGET, PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { PillButtonProps } from "@/lib/interfaces/ui";

export function PillButton({ label, tone, icon, onPress }: PillButtonProps) {
  const verticalSlop = (MIN_TOUCH_TARGET - PILL_MIN_HEIGHT) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: verticalSlop, bottom: verticalSlop, left: 4, right: 4 }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Pill label={label} tone={tone} icon={icon} />
    </Pressable>
  );
}
