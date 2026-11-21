import { Pressable } from "react-native";
import { SwitchControl } from "@/components/ui/switch-control";
import { SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { RuleEnabledSwitchProps } from "@/lib/interfaces/settings";

export function RuleEnabledSwitch({ accessibilityLabel, value, onValueChange, disabled = false }: RuleEnabledSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={SPACING.sm}
      onPress={() => onValueChange(!value)}
      style={{ opacity: disabled ? DISABLED_OPACITY : 1 }}
    >
      <SwitchControl value={value} />
    </Pressable>
  );
}
