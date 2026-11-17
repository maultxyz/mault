import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { SaveBarProps } from "@/lib/interfaces/ui";

export function SaveBar({ visible, saving, onSave, onDiscard }: SaveBarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const wasSavingRef = useRef(saving);
  useEffect(() => {
    if (wasSavingRef.current && !saving && !visible) AccessibilityInfo.announceForAccessibility(t("common.changesSaved"));
    wasSavingRef.current = saving;
  }, [saving, visible, t]);
  if (!visible) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <AppText size="xs" tone="secondary" style={{ flex: 1 }}>
        {t("common.unsavedChanges")}
      </AppText>
      <Button variant="ghost" label={t("common.discard")} disabled={saving} onPress={onDiscard} />
      <Button label={t("common.save")} loading={saving} onPress={onSave} />
    </View>
  );
}
