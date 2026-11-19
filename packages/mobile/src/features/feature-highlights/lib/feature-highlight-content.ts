import type { FeatureHighlight, FeatureHighlightText } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { WEB_URL } from "@/lib/constants/config";
import type { FeatureHighlightCarouselSlide } from "@/lib/interfaces/feature-highlights";

export function resolveFeatureHighlightText(t: TFunction, text: FeatureHighlightText): string {
  return text.kind === "translated" ? t(text.key) : text.value;
}

export function resolveFeatureHighlightUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${WEB_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function featureHighlightCarouselSlides(highlights: FeatureHighlight[]): FeatureHighlightCarouselSlide[] {
  return highlights.flatMap((highlight) =>
    highlight.slides.map((slide, slideIndex) => ({
      key: `${highlight.id}:${slideIndex}`,
      highlightId: highlight.id,
      slide,
    })),
  );
}
