import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SwitchControl } from "@/components/ui/switch-control";
import { SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { SwitchRowProps } from "@/lib/interfaces/ui";

export function SwitchRow({ title, description, value, onValueChange, disabled = false }: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight="medium">{title}</AppText>
        {description ? (
          <AppText size="xs" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <SwitchControl value={value} />
    </Pressable>
  );
}
