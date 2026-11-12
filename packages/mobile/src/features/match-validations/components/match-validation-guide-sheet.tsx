import { useTranslation } from "react-i18next";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { MatchValidationProgressBar } from "@/features/match-validations/components/match-validation-progress-bar";
import { useTheme } from "@/hooks/use-theme";
import { MATCH_VALIDATION_GUIDE_ITEMS } from "@/lib/constants/match-validations";
import { SPACING } from "@/lib/constants/theme";
import type { MatchValidationGuideSheetProps } from "@/lib/interfaces/match-validations";

export function MatchValidationGuideSheet({ visible, onClose }: MatchValidationGuideSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("matchValidations.guide.title")}
      contentContainerStyle={{ gap: SPACING.lg }}
      footer={<Button label={t("matchValidations.guide.done")} onPress={onClose} />}
    >
      <View style={{ gap: SPACING.xs }}>
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
    </Sheet>
  );
}
