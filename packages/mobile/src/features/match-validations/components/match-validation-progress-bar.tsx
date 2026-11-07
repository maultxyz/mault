import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";

export function MatchValidationProgressBar() {
  const { t } = useTranslation();
  const colors = useTheme();
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
      <View style={{ flex: 1, height: 6, borderRadius: RADIUS.full, backgroundColor: colors.tonal, overflow: "hidden" }}>
        <View style={{ width: `${percent}%`, height: "100%", borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
      </View>
      <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
        {t("matchValidations.progress.percent", { percent })}
      </AppText>
    </View>
  );
}
