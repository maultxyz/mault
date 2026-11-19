import {
  FEATURE_HIGHLIGHT_MAX_AGE_DAYS,
  FEATURE_HIGHLIGHT_MAX_SHOWN,
  type AdminFeatureHighlightSlideInput,
  type FeatureHighlight,
  type FeatureHighlightSlide,
  type FeatureHighlightTimelinePage,
  type FeatureHighlightsResponse,
} from "@magic-vault/shared";
import { FEATURE_HIGHLIGHT_TIMELINE_CURSOR_SEPARATOR } from "./constants/feature-highlights";
import type {
  AdminFeatureHighlightRowForSelection,
  FeatureHighlightTimelineCursor,
  SelectFeatureHighlightsOptions,
  SelectFeatureHighlightTimelinePageOptions,
} from "./interfaces/feature-highlights";

const DAY_MS = 24 * 60 * 60 * 1000;

function publishedMsOf(highlight: FeatureHighlight): number {
  return new Date(highlight.publishedAt).getTime();
}

export function compareFeatureHighlightsNewestFirst(
  first: FeatureHighlight,
  second: FeatureHighlight,
): number {
  const byPublishedAt = publishedMsOf(second) - publishedMsOf(first);
  if (byPublishedAt !== 0) return byPublishedAt;
  if (first.id === second.id) return 0;
  return first.id > second.id ? -1 : 1;
}

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
    .sort(compareFeatureHighlightsNewestFirst);
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
  guid: string | null;
  publishedAt: Date;
  slides: AdminFeatureHighlightSlideInput[];
}): FeatureHighlight {
  return {
    id: row.guid!,
    source: "admin",
    publishedAt: row.publishedAt.toISOString(),
    slides: row.slides.map(toFeatureHighlightSlide),
  };
}

export function publishedFeatureHighlightsOf(
  releaseHighlights: FeatureHighlight[],
  adminRows: AdminFeatureHighlightRowForSelection[],
): FeatureHighlight[] {
  return [
    ...releaseHighlights,
    ...adminRows
      .filter((row) => row.isPublished && !row.isDeleted)
      .map(toAdminSourcedFeatureHighlight),
  ];
}

export function toFeatureHighlightTimelineCursor(
  highlight: FeatureHighlight,
): string {
  return `${new Date(highlight.publishedAt).toISOString()}${FEATURE_HIGHLIGHT_TIMELINE_CURSOR_SEPARATOR}${highlight.id}`;
}

export function parseFeatureHighlightTimelineCursor(
  value: string,
): FeatureHighlightTimelineCursor | null {
  const separatorIndex = value.indexOf(FEATURE_HIGHLIGHT_TIMELINE_CURSOR_SEPARATOR);
  const publishedAtText =
    separatorIndex === -1 ? value : value.slice(0, separatorIndex);
  const highlightId =
    separatorIndex === -1 ? null : value.slice(separatorIndex + 1);
  const publishedMs = new Date(publishedAtText).getTime();
  if (!publishedAtText || Number.isNaN(publishedMs)) return null;
  if (highlightId === "") return null;
  return { publishedMs, highlightId };
}

function isAfterTimelineCursor(
  highlight: FeatureHighlight,
  cursor: FeatureHighlightTimelineCursor,
): boolean {
  const publishedMs = publishedMsOf(highlight);
  if (publishedMs !== cursor.publishedMs) return publishedMs < cursor.publishedMs;
  return cursor.highlightId !== null && highlight.id < cursor.highlightId;
}

export function selectFeatureHighlightTimelinePage({
  highlights,
  seenHighlightIds,
  before,
  pageSize,
  now,
}: SelectFeatureHighlightTimelinePageOptions): FeatureHighlightTimelinePage {
  const nowMs = now.getTime();
  const remaining = highlights
    .filter((highlight) => publishedMsOf(highlight) <= nowMs)
    .filter((highlight) => !before || isAfterTimelineCursor(highlight, before))
    .sort(compareFeatureHighlightsNewestFirst);
  const page = remaining.slice(0, pageSize);
  const lastOnPage = page[page.length - 1];
  return {
    highlights: page,
    seenHighlightIds: page
      .filter((highlight) => seenHighlightIds.has(highlight.id))
      .map((highlight) => highlight.id),
    nextBefore:
      remaining.length > pageSize && lastOnPage
        ? toFeatureHighlightTimelineCursor(lastOnPage)
        : null,
  };
}
