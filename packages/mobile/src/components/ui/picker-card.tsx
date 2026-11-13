import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { LoadingLogo } from "@/components/ui/loading-logo";
import { LOADING_LOGO_INLINE_SIZE } from "@/lib/constants/loading";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
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
        padding: SPACING.md + 2,
        borderRadius: SURFACE_RADIUS,
        borderCurve: "continuous",
        backgroundColor: pressed ? colors.muted : colors.card,
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
      {loading ? <LoadingLogo size={LOADING_LOGO_INLINE_SIZE} /> : <Icon name="expand" size={18} color={colors.foreground} />}
    </Pressable>
  );
}
