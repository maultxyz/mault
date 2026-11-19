import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { FeatureHighlightMediaView } from "@/features/feature-highlights/components/feature-highlight-media-view";
import {
  resolveFeatureHighlightUrl,
  resolveFeatureHighlightText,
} from "@/features/feature-highlights/lib/feature-highlight-content";
import { SPACING } from "@/lib/constants/theme";
import type { FeatureHighlightSlideViewProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightSlideView({ slide }: FeatureHighlightSlideViewProps) {
  const { t } = useTranslation();
  const link = slide.link;
  return (
    <View style={{ gap: SPACING.md }}>
      {slide.media ? <FeatureHighlightMediaView media={slide.media} /> : null}
      <View style={{ gap: SPACING.xs }}>
        <AppText size="base" heading weight="bold" accessibilityRole="header">
          {resolveFeatureHighlightText(t, slide.title)}
        </AppText>
        <AppText size="sm" tone="secondary">
          {resolveFeatureHighlightText(t, slide.body)}
        </AppText>
      </View>
      {link ? (
        <Button
          variant="secondary"
          icon="external"
          label={resolveFeatureHighlightText(t, link.label) || t("featureHighlights.learnMore")}
          accessibilityHint={t("featureHighlights.opensInBrowser")}
          onPress={() => void Linking.openURL(resolveFeatureHighlightUrl(link.url))}
          style={{ alignSelf: "flex-start" }}
        />
      ) : null}
    </View>
  );
}
