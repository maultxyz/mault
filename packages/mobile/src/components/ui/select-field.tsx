import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, INPUT_HEIGHT } from "@/lib/constants/ui";
import type { SelectFieldProps } from "@/lib/interfaces/ui";

export function SelectField({ label, value, placeholder, onPress, disabled = false }: SelectFieldProps) {
  const colors = useTheme();
  return (
    <View style={{ gap: SPACING.xs + 2, flexGrow: 1, flexShrink: 1, minWidth: 96 }}>
      {label ? (
        <AppText size="xs" weight="medium">
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[label, value ?? placeholder].filter(Boolean).join(": ")}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          height: INPUT_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.xs,
          paddingHorizontal: SPACING.md,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: pressed ? colors.muted : colors.inputBackground,
          opacity: disabled ? DISABLED_OPACITY : 1,
        })}
      >
        <AppText numberOfLines={1} tone={value ? "default" : "secondary"} style={{ flex: 1 }}>
          {value ?? placeholder}
        </AppText>
        <Icon name="expand" size={16} color={colors.foregroundSecondary} />
      </Pressable>
    </View>
  );
}
