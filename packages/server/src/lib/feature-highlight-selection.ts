import {
  FEATURE_HIGHLIGHT_MAX_AGE_DAYS,
  FEATURE_HIGHLIGHT_MAX_SHOWN,
  type AdminFeatureHighlightSlideInput,
  type FeatureHighlight,
  type FeatureHighlightSlide,
  type FeatureHighlightsResponse,
} from "@magic-vault/shared";
import type { SelectFeatureHighlightsOptions } from "./interfaces/feature-highlights";

const DAY_MS = 24 * 60 * 60 * 1000;

export function featureHighlightsInWindow(
  highlights: FeatureHighlight[],
  now: Date,
): FeatureHighlight[] {
  const nowMs = now.getTime();
  const oldestMs = nowMs - FEATURE_HIGHLIGHT_MAX_AGE_DAYS * DAY_MS;
  return highlights
    .filter((highlight) => {
      const publishedMs = new Date(highlight.publishedAt).getTime();
      return publishedMs <= nowMs && publishedMs >= oldestMs;
    })
    .sort(
      (first, second) =>
        new Date(second.publishedAt).getTime() -
        new Date(first.publishedAt).getTime(),
    );
}

export function selectFeatureHighlights({
  highlights,
  seenHighlightIds,
  includesSeenHighlights,
  now,
}: SelectFeatureHighlightsOptions): FeatureHighlightsResponse {
  const inWindow = featureHighlightsInWindow(highlights, now);
  const shown = (
    includesSeenHighlights
      ? inWindow
      : inWindow.filter((highlight) => !seenHighlightIds.has(highlight.id))
  ).slice(0, FEATURE_HIGHLIGHT_MAX_SHOWN);
  return {
    highlights: shown,
    seenHighlightIds: includesSeenHighlights
      ? shown
          .filter((highlight) => seenHighlightIds.has(highlight.id))
          .map((highlight) => highlight.id)
      : [],
  };
}

export function filterKnownFeatureHighlightIds(
  requestedHighlightIds: string[],
  knownHighlightIds: ReadonlySet<string>,
): string[] {
  return [...new Set(requestedHighlightIds)].filter((highlightId) =>
    knownHighlightIds.has(highlightId),
  );
}

export function toFeatureHighlightSlide(
  slide: AdminFeatureHighlightSlideInput,
): FeatureHighlightSlide {
  return {
    title: { kind: "literal", value: slide.title },
    body: { kind: "literal", value: slide.body },
    media:
      slide.mediaType && slide.mediaUrl
        ? {
            type: slide.mediaType,
            url: slide.mediaUrl,
            posterUrl: slide.mediaPosterUrl,
            altText: { kind: "literal", value: slide.mediaAltText },
          }
        : null,
    link: slide.linkUrl
      ? { url: slide.linkUrl, label: { kind: "literal", value: slide.linkLabel } }
      : null,
  };
}

export function toAdminSourcedFeatureHighlight(row: {
  guid: string;
  publishedAt: Date;
  slides: AdminFeatureHighlightSlideInput[];
}): FeatureHighlight {
  return {
    id: row.guid,
    source: "admin",
    publishedAt: row.publishedAt.toISOString(),
    slides: row.slides.map(toFeatureHighlightSlide),
  };
}
