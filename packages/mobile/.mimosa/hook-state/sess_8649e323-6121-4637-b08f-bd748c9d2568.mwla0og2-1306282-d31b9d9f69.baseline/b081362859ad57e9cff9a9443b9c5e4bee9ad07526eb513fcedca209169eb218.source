import { Pressable } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_RADIUS, SPACING } from "@/lib/constants/theme";
import type { CameraNoticeActionProps } from "@/lib/interfaces/scanner";

export function CameraNoticeAction({ label, onPress }: CameraNoticeActionProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={SPACING.xs}
      style={({ pressed }) => ({
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: CONTROL_RADIUS,
        backgroundColor: colors.onBrandSurface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
        {label}
      </AppText>
    </Pressable>
  );
}
