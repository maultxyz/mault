import { Switch, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { SwitchControlProps } from "@/lib/interfaces/ui";

export function SwitchControl({ value }: SwitchControlProps) {
  const colors = useTheme();
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Switch
        value={value}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.background}
        ios_backgroundColor={colors.muted}
      />
    </View>
  );
}
