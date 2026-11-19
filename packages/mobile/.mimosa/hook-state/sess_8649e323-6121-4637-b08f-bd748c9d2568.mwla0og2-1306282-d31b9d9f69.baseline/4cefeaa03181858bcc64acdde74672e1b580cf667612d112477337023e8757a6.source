import { useEffect } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { CameraNoticeAction } from "@/features/scanner/components/camera-notice-action";
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
  const announcement = [title, description].filter(Boolean).join(". ");
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);
  return (
    <View
      accessibilityRole={tone === "destructive" || tone === "warning" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: colors.cameraScrim,
      }}
    >
      <Icon name={icon} size={16} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
          {title}
        </AppText>
        {description ? (
          <AppText size="xs" style={{ color: colors.onCamera, opacity: 0.8 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <CameraNoticeAction label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}
