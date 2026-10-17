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
      style={({ pressed }) => ({ alignItems: "center", gap: SPACING.sm, flex: 1, opacity: disabled ? DISABLED_OPACITY : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <View
        style={{
          width: QUICK_ACTION_SIZE,
          height: QUICK_ACTION_SIZE,
          borderRadius: RADIUS.full,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={24} color={colors.primaryForeground} />
      </View>
      <AppText size="xs" weight="semibold" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}
