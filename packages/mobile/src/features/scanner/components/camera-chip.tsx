import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CameraChipProps } from "@/lib/interfaces/ui";

export function CameraChip({ label, dotColor, icon, onPress }: CameraChipProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        backgroundColor: colors.cameraScrim,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: dotColor }} /> : null}
      {icon ? <Icon name={icon} size={14} color={colors.onCamera} /> : null}
      <AppText size="xs" weight="medium" numberOfLines={1} style={{ flexShrink: 1, color: colors.onCamera }}>
        {label}
      </AppText>
      {onPress ? <Icon name="chevron" size={12} color={colors.onCamera} /> : null}
    </Pressable>
  );
}
