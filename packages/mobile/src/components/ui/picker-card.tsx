import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { PickerCardProps } from "@/lib/interfaces/ui";

export function PickerCard({ icon, label, value, placeholder, onPress, disabled = false, loading = false }: PickerCardProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        backgroundColor: pressed ? colors.border : colors.muted,
        opacity: disabled ? DISABLED_OPACITY : 1,
      })}
    >
      <IconBadge name={icon} tone="primary" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="xs" tone="secondary">
          {label}
        </AppText>
        <AppText size="base" weight="semibold" numberOfLines={1} tone={value ? "default" : "secondary"}>
          {value ?? placeholder}
        </AppText>
      </View>
      {loading ? <ActivityIndicator size="small" color={colors.foregroundSecondary} /> : <Icon name="expand" size={18} color={colors.foreground} />}
    </Pressable>
  );
}
