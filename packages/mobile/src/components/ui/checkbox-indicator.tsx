import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CARD_THUMBNAIL_RADIUS } from "@/lib/constants/theme";
import { CHECKBOX_INDICATOR_SIZE, DISABLED_OPACITY } from "@/lib/constants/ui";
import type { CheckboxIndicatorProps } from "@/lib/interfaces/ui";

export function CheckboxIndicator({ checked, disabled = false }: CheckboxIndicatorProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        width: CHECKBOX_INDICATOR_SIZE,
        height: CHECKBOX_INDICATOR_SIZE,
        borderRadius: CARD_THUMBNAIL_RADIUS,
        borderWidth: 1.5,
        borderColor: checked ? colors.primary : colors.foregroundSecondary,
        backgroundColor: checked ? colors.primary : colors.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
    >
      {checked ? <Icon name="check" size={16} color={colors.primaryForeground} /> : null}
    </View>
  );
}
