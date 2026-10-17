import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CameraNoticeProps } from "@/lib/interfaces/ui";

export function CameraNotice({ tone, title, description, actionLabel, onAction }: CameraNoticeProps) {
  const colors = useTheme();
  const accent = {
    info: { color: colors.info, icon: "info" },
    success: { color: colors.success, icon: "success" },
    warning: { color: colors.warning, icon: "warning" },
    destructive: { color: colors.destructive, icon: "error" },
  } as const;
  const { color, icon } = accent[tone];
  return (
    <View
      accessibilityRole={tone === "destructive" || tone === "warning" ? "alert" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        backgroundColor: colors.cameraScrim,
      }}
    >
      <Icon name={icon} size={16} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
          {title}
        </AppText>
        {description ? (
          <AppText size="xs" numberOfLines={2} style={{ color: colors.onCamera, opacity: 0.8 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={SPACING.sm}
          style={({ pressed }) => ({
            paddingHorizontal: SPACING.sm + 2,
            paddingVertical: 6,
            borderRadius: RADIUS.md,
            backgroundColor: colors.onBrandSurface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
