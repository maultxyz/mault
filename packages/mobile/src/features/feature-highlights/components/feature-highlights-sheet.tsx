import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, PanResponder, View } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureHighlightSlideView } from "@/features/feature-highlights/components/feature-highlight-slide-view";
import { FeatureHighlightStepIndicator } from "@/features/feature-highlights/components/feature-highlight-step-indicator";
import {
  featureHighlightCarouselSlides,
  resolveFeatureHighlightText,
} from "@/features/feature-highlights/lib/feature-highlight-content";
import {
  FEATURE_HIGHLIGHT_SKELETON_MEDIA_HEIGHT,
  FEATURE_HIGHLIGHT_SWIPE_MIN_DISTANCE,
  FEATURE_HIGHLIGHT_SWIPE_START_DISTANCE,
} from "@/lib/constants/feature-highlights";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { FeatureHighlightsSheetProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightsSheet({
  visible,
  highlights,
  isLoading = false,
  isLoadError = false,
  isRetrying = false,
  onRetryLoad,
  onClose,
}: FeatureHighlightsSheetProps) {
  const { t } = useTranslation();
  const slides = featureHighlightCarouselSlides(highlights ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideIndex = Math.min(currentIndex, Math.max(slides.length - 1, 0));
  const currentSlide = slides[slideIndex];
  const isLastSlide = slideIndex >= slides.length - 1;

  useEffect(() => {
    if (visible) setCurrentIndex(0);
  }, [visible]);

  const shownHighlightIds = () => (highlights ?? []).map((highlight) => highlight.id);
  const close = () => onClose(shownHighlightIds());
  const showSlide = (nextIndex: number) => {
    const nextSlide = slides[nextIndex];
    if (!nextSlide || nextIndex === slideIndex) return;
    setCurrentIndex(nextIndex);
    AccessibilityInfo.announceForAccessibility(
      `${t("featureHighlights.step", { current: nextIndex + 1, total: slides.length })}. ${resolveFeatureHighlightText(t, nextSlide.slide.title)}`,
    );
  };
  const goBack = () => showSlide(slideIndex - 1);
  const goNext = () => showSlide(slideIndex + 1);

  const swipeHandlers = useRef({ goBack, goNext });
  swipeHandlers.current = { goBack, goNext };
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > FEATURE_HIGHLIGHT_SWIPE_START_DISTANCE && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -FEATURE_HIGHLIGHT_SWIPE_MIN_DISTANCE) swipeHandlers.current.goNext();
        if (gesture.dx >= FEATURE_HIGHLIGHT_SWIPE_MIN_DISTANCE) swipeHandlers.current.goBack();
      },
    }),
  ).current;

  const footer = currentSlide ? (
    <View style={{ gap: SPACING.md }}>
      <FeatureHighlightStepIndicator currentIndex={slideIndex} total={slides.length} />
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        {slideIndex > 0 ? (
          <Button variant="secondary" label={t("featureHighlights.back")} onPress={goBack} style={{ flex: 1 }} />
        ) : null}
        <Button
          label={isLastSlide ? t("featureHighlights.gotIt") : t("featureHighlights.next")}
          onPress={isLastSlide ? close : goNext}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  ) : undefined;

  return (
    <Sheet visible={visible} onClose={close} title={t("featureHighlights.title")} footer={footer}>
      {currentSlide ? (
        <View key={currentSlide.key} {...panResponder.panHandlers}>
          <FeatureHighlightSlideView slide={currentSlide.slide} />
        </View>
      ) : isLoading ? (
        <View accessible accessibilityLabel={t("common.loading")} style={{ gap: SPACING.md }}>
          <Skeleton height={FEATURE_HIGHLIGHT_SKELETON_MEDIA_HEIGHT} radius={SURFACE_RADIUS} />
          <Skeleton width="60%" height={20} />
          <Skeleton height={40} />
        </View>
      ) : isLoadError && onRetryLoad ? (
        <QueryErrorState title={t("featureHighlights.loadFailed")} onRetry={onRetryLoad} isRetrying={isRetrying} />
      ) : (
        <EmptyState icon="sparkles" title={t("featureHighlights.empty")} />
      )}
    </Sheet>
  );
}
