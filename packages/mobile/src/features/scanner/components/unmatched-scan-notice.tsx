import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Platform, Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { UnmatchedScanNoticeProps } from "@/lib/interfaces/scanner";

export function UnmatchedScanNotice({ canRetry, onRetry, onSearchByName, onSkip }: UnmatchedScanNoticeProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const title = t("scan.unmatchedRecovery.title");
  const description = t("scan.unmatchedRecovery.description");

  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(`${title}. ${description}`);
  }, [title, description]);

  const actions = [
    ...(canRetry ? [{ key: "retry", label: t("scan.unmatchedRecovery.retry"), onPress: onRetry }] : []),
    { key: "search", label: t("scan.unmatchedRecovery.searchByName"), onPress: onSearchByName },
    { key: "skip", label: t("scan.unmatchedRecovery.skip"), onPress: onSkip },
  ];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: colors.cameraScrim,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <Icon name="warning" size={16} color={colors.warning} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
            {title}
          </AppText>
          <AppText size="xs" style={{ color: colors.onCamera, opacity: 0.8 }}>
            {description}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            onPress={action.onPress}
            hitSlop={SPACING.xs}
            style={({ pressed }) => ({
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              borderRadius: RADIUS.md,
              backgroundColor: colors.onBrandSurface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <AppText size="xs" weight="medium" style={{ color: colors.onCamera }}>
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
