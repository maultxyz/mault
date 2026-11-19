import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  resolveFeatureHighlightUrl,
  resolveFeatureHighlightText,
} from "@/features/feature-highlights/lib/feature-highlight-content";
import { useTheme } from "@/hooks/use-theme";
import {
  FEATURE_HIGHLIGHT_MEDIA_ASPECT_RATIO,
  FEATURE_HIGHLIGHT_VIDEO_PLACEHOLDER_ICON_SIZE,
} from "@/lib/constants/feature-highlights";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { FeatureHighlightMediaViewProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightMediaView({ media }: FeatureHighlightMediaViewProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const altText = resolveFeatureHighlightText(t, media.altText);
  const frameStyle = {
    width: "100%" as const,
    aspectRatio: FEATURE_HIGHLIGHT_MEDIA_ASPECT_RATIO,
    borderRadius: SURFACE_RADIUS,
    overflow: "hidden" as const,
    backgroundColor: colors.muted,
  };

  if (media.type === "image") {
    return (
      <Image
        source={{ uri: resolveFeatureHighlightUrl(media.url) }}
        contentFit="contain"
        autoplay={!reduceMotion}
        accessible={!!altText}
        accessibilityRole="image"
        accessibilityLabel={altText || undefined}
        style={frameStyle}
      />
    );
  }

  const videoUrl = resolveFeatureHighlightUrl(media.url);
  return (
    <View style={{ gap: SPACING.sm }}>
      {media.posterUrl ? (
        <Image
          source={{ uri: resolveFeatureHighlightUrl(media.posterUrl) }}
          contentFit="contain"
          accessible={!!altText}
          accessibilityRole="image"
          accessibilityLabel={altText || undefined}
          style={frameStyle}
        />
      ) : (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={altText || t("featureHighlights.videoPlaceholder")}
          style={[frameStyle, { alignItems: "center", justifyContent: "center", gap: SPACING.xs }]}
        >
          <Icon name="play" size={FEATURE_HIGHLIGHT_VIDEO_PLACEHOLDER_ICON_SIZE} color={colors.foregroundSecondary} />
          <AppText size="xs" tone="secondary">
            {t("featureHighlights.videoPlaceholder")}
          </AppText>
        </View>
      )}
      <Button
        variant="secondary"
        icon="external"
        label={t("featureHighlights.openVideo")}
        accessibilityHint={t("featureHighlights.opensInBrowser")}
        onPress={() => void Linking.openURL(videoUrl)}
      />
    </View>
  );
}
