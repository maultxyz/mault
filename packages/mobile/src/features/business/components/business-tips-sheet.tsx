import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { BUSINESS_TIPS } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessTipsSheetProps } from "@/lib/interfaces/business";

export function BusinessTipsSheet({ topic, visible, onClose }: BusinessTipsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t(`businessTips.${topic}.title`)}
      contentContainerStyle={{ gap: SPACING.lg }}
      footer={<Button label={t("businessTips.done")} onPress={onClose} />}
    >
      {BUSINESS_TIPS[topic].map((tip) => (
        <View key={tip.key} accessible style={{ flexDirection: "row", alignItems: "flex-start", gap: SPACING.md }}>
          <Icon name={tip.icon} size={22} color={colors.primaryText} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText weight="semibold">{t(`businessTips.${topic}.${tip.key}.title`)}</AppText>
            <AppText size="sm" tone="secondary">
              {t(`businessTips.${topic}.${tip.key}.description`)}
            </AppText>
          </View>
        </View>
      ))}
    </Sheet>
  );
}
