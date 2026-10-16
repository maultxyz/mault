import { Switch, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { SwitchRowProps } from "@/lib/interfaces/ui";

export function SwitchRow({ title, description, value, onValueChange, disabled = false }: SwitchRowProps) {
  const colors = useTheme();
  return (
    <View
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
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.background}
        ios_backgroundColor={colors.muted}
      />
    </View>
  );
}
