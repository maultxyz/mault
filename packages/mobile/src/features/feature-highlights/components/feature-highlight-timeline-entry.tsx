import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { Surface } from "@/components/ui/surface";
import { FeatureHighlightSlideView } from "@/features/feature-highlights/components/feature-highlight-slide-view";
import { SPACING } from "@/lib/constants/theme";
import { formatMediumDate } from "@/lib/dates";
import type { FeatureHighlightTimelineEntryProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightTimelineEntry({ highlight, isNew }: FeatureHighlightTimelineEntryProps) {
  const { t, i18n } = useTranslation();
  return (
    <Surface style={{ gap: SPACING.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <AppText size="xs" tone="secondary" style={{ flexShrink: 1 }}>
          {formatMediumDate(highlight.publishedAt, i18n.language)}
        </AppText>
        {isNew ? <Pill tone="primary" label={t("featureHighlights.timeline.new")} /> : null}
      </View>
      {highlight.slides.map((slide, slideIndex) => (
        <FeatureHighlightSlideView key={slideIndex} slide={slide} />
      ))}
    </Surface>
  );
}
