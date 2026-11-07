import { useTranslation } from "react-i18next";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MatchValidationProgressBar } from "@/features/match-validations/components/match-validation-progress-bar";
import { useTheme } from "@/hooks/use-theme";
import { MATCH_VALIDATION_GUIDE_ITEMS } from "@/lib/constants/match-validations";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { MatchValidationGuideSheetProps } from "@/lib/interfaces/match-validations";

export function MatchValidationGuideSheet({ visible, onClose }: MatchValidationGuideSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.dismiss")}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.overlay }}
      />
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        style={{
          maxHeight: "85%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.lg }}>
          <View style={{ gap: SPACING.xs }}>
            <AppText size="base" heading weight="semibold" accessibilityRole="header">
              {t("matchValidations.guide.title")}
            </AppText>
            <AppText size="sm" tone="secondary">
              {t("matchValidations.description", { required: MATCH_VALIDATION_REVIEWS_REQUIRED })}
            </AppText>
            <AppText size="sm" tone="secondary">
              {t("matchValidations.guide.intro")}
            </AppText>
            <MatchValidationProgressBar />
          </View>
          {MATCH_VALIDATION_GUIDE_ITEMS.map(({ key, icon }) => (
            <View key={key} style={{ flexDirection: "row", gap: SPACING.md }}>
              <Icon name={icon} size={18} color={colors.foreground} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="semibold">{t(`matchValidations.actions.${key}`)}</AppText>
                <AppText size="sm" tone="secondary">
                  {t(`matchValidations.guide.items.${key}`)}
                </AppText>
              </View>
            </View>
          ))}
          <Button label={t("matchValidations.guide.done")} onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
