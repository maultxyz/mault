import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { playSuccessHaptic } from "@/lib/haptics";
import type { SaveBarProps } from "@/lib/interfaces/ui";

export function SaveBar({ visible, saving, onSave, onDiscard, errorMessage }: SaveBarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const wasSavingRef = useRef(saving);
  useEffect(() => {
    if (wasSavingRef.current && !saving && !visible) {
      playSuccessHaptic();
      AccessibilityInfo.announceForAccessibility(t("common.changesSaved"));
    }
    wasSavingRef.current = saving;
  }, [saving, visible, t]);
  useEffect(() => {
    if (errorMessage && visible && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage, visible]);
  if (!visible) return null;
  return (
    <View
      style={{
        gap: SPACING.sm,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md + insets.bottom,
        backgroundColor: colors.background,
      }}
    >
      {errorMessage ? (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}
        >
          <Icon name="error" size={16} color={colors.destructiveForeground} />
          <AppText size="sm" weight="medium" style={{ flex: 1, color: colors.destructiveForeground }}>
            {errorMessage}
          </AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <AppText size="xs" tone="secondary" style={{ flex: 1 }}>
          {t("common.unsavedChanges")}
        </AppText>
        <Button variant="ghost" label={t("common.discard")} disabled={saving} onPress={onDiscard} />
        <Button label={t("common.save")} loading={saving} onPress={onSave} />
      </View>
    </View>
  );
}
