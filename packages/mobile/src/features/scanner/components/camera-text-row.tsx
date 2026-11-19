import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { CAMERA_TEXT_SHADOW } from "@/lib/constants/ui";
import type { CameraTextRowProps } from "@/lib/interfaces/ui";

export function CameraTextRow({ label, accessibilityLabel, emphasis = "detail", dotColor, icon, onPress }: CameraTextRowProps) {
  const colors = useTheme();
  const isTitle = emphasis === "title";
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={SPACING.xs}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        maxWidth: "100%",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: dotColor }} /> : null}
      {icon ? <Icon name={icon} size={isTitle ? 18 : 14} color={colors.onCamera} /> : null}
      <AppText
        size={isTitle ? "lg" : "xs"}
        heading={isTitle}
        weight={isTitle ? "semibold" : "medium"}
        numberOfLines={1}
        style={[{ flexShrink: 1, color: colors.onCamera }, CAMERA_TEXT_SHADOW]}
      >
        {label}
      </AppText>
      {onPress ? <Icon name="chevron" size={isTitle ? 16 : 12} color={colors.onCamera} /> : null}
    </Pressable>
  );
}
