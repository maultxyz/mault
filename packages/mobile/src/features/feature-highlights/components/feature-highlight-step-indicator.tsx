import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import {
  FEATURE_HIGHLIGHT_STEP_DOT_ACTIVE_WIDTH,
  FEATURE_HIGHLIGHT_STEP_DOT_SIZE,
} from "@/lib/constants/feature-highlights";
import { SPACING } from "@/lib/constants/theme";
import type { FeatureHighlightStepIndicatorProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightStepIndicator({ currentIndex, total }: FeatureHighlightStepIndicatorProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md }}>
      <AppText size="xs" tone="secondary">
        {t("featureHighlights.step", { current: currentIndex + 1, total })}
      </AppText>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}
      >
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={{
              width: index === currentIndex ? FEATURE_HIGHLIGHT_STEP_DOT_ACTIVE_WIDTH : FEATURE_HIGHLIGHT_STEP_DOT_SIZE,
              height: FEATURE_HIGHLIGHT_STEP_DOT_SIZE,
              borderRadius: FEATURE_HIGHLIGHT_STEP_DOT_SIZE / 2,
              backgroundColor: index === currentIndex ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
