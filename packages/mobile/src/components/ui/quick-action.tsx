import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, QUICK_ACTION_SIZE } from "@/lib/constants/ui";
import type { QuickActionProps } from "@/lib/interfaces/ui";

export function QuickAction({ icon, label, onPress, disabled = false }: QuickActionProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        gap: SPACING.xs + 2,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.muted : colors.card,
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      <View
        style={{
          width: QUICK_ACTION_SIZE,
          height: QUICK_ACTION_SIZE,
          borderRadius: RADIUS.sm + 2,
          backgroundColor: colors.primaryMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={16} color={colors.primaryText} />
      </View>
      <AppText size="xs" weight="medium" numberOfLines={1} style={{ paddingHorizontal: SPACING.xs }}>
        {label}
      </AppText>
    </Pressable>
  );
}
