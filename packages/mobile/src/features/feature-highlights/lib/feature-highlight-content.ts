import type { FeatureHighlight, FeatureHighlightText } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { WEB_URL } from "@/lib/constants/config";
import { formatMonthYear } from "@/lib/dates";
import type {
  FeatureHighlightCarouselSlide,
  FeatureHighlightTimelineSection,
} from "@/lib/interfaces/feature-highlights";

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

export function featureHighlightTimelineSections(
  highlights: FeatureHighlight[],
  locale: string,
): FeatureHighlightTimelineSection[] {
  const sections: FeatureHighlightTimelineSection[] = [];
  const seenHighlightIds = new Set<string>();
  for (const highlight of highlights) {
    if (seenHighlightIds.has(highlight.id)) continue;
    seenHighlightIds.add(highlight.id);
    const publishedAt = new Date(highlight.publishedAt);
    const monthKey = `${publishedAt.getFullYear()}-${publishedAt.getMonth()}`;
    const lastSection = sections[sections.length - 1];
    if (lastSection?.key === monthKey) {
      lastSection.data.push(highlight);
      continue;
    }
    sections.push({ key: monthKey, title: formatMonthYear(publishedAt, locale), data: [highlight] });
  }
  return sections;
}
