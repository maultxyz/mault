import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { describeCondition } from "@/features/rules/lib/rules";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { ConditionRowProps } from "@/lib/interfaces/rules";

export function ConditionRow({ condition, fieldDefinitions, disabled = false, onPress }: ConditionRowProps) {
  const colors = useTheme();
  const { field, predicate } = describeCondition(condition, fieldDefinitions);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${field} ${predicate}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md - 2,
        backgroundColor: pressed ? colors.border : "transparent",
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="base" weight="semibold" numberOfLines={1}>
          {field}
        </AppText>
        <AppText size="sm" tone="secondary" numberOfLines={2}>
          {predicate}
        </AppText>
      </View>
      {!disabled ? <Icon name="chevron" size={16} color={colors.foregroundSecondary} /> : null}
    </Pressable>
  );
}
