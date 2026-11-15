import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { SPACING } from "@/lib/constants/theme";

export function MatchValidationProgressBar() {
  const { t } = useTranslation();
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  if (!progress || progress.scanCount === 0) return null;

  const reviewsNeeded = progress.scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED;
  const percent = Math.min(100, Math.floor((progress.reviewCount / reviewsNeeded) * 100));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("matchValidations.progress.label")}
      accessibilityValue={{
        min: 0,
        max: reviewsNeeded,
        now: progress.reviewCount,
        text: t("matchValidations.progress.valueText", { done: progress.reviewCount, total: reviewsNeeded }),
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}
    >
      <ProgressBar fraction={percent / 100} />
      <AppText size="xs" tone="secondary">
        {t("matchValidations.progress.percent", { percent })}
      </AppText>
    </View>
  );
}
