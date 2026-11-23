import {
  RELEASE_FEATURE_HIGHLIGHTS,
  type AdminFeatureHighlight,
  type AdminFeatureHighlightSlideInput,
  type FeatureHighlight,
  type FeatureHighlightSlide,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { authQuery, db } from "../db";
import { featureHighlightViews, featureHighlights } from "../db/schema";
import { createCachedValue } from "./cached-value";
import { FEATURE_HIGHLIGHTS_CACHE_MAX_AGE_MS } from "./constants/feature-highlights";
import {
  resolveFeatureHighlightMediaUrl,
  toPersistedFeatureHighlightMediaUrl,
} from "./feature-highlight-media";
import { publishedFeatureHighlightsOf } from "./feature-highlight-selection";

type FeatureHighlightRow = typeof featureHighlights.$inferSelect;

const liveFeatureHighlightsCache = createCachedValue("featureHighlights.live", () =>
  db
    .select()
    .from(featureHighlights)
    .where(eq(featureHighlights.isDeleted, false)),
);

export function invalidateFeatureHighlightsCache(): void {
  liveFeatureHighlightsCache.invalidate();
}

export function loadLiveFeatureHighlightRows(): Promise<FeatureHighlightRow[]> {
  return liveFeatureHighlightsCache.get(FEATURE_HIGHLIGHTS_CACHE_MAX_AGE_MS);
}

export async function loadPublishedFeatureHighlights(): Promise<FeatureHighlight[]> {
  return publishedFeatureHighlightsOf(
    RELEASE_FEATURE_HIGHLIGHTS,
    await loadLiveFeatureHighlightRows(),
  );
}

export async function loadKnownFeatureHighlightIds(): Promise<Set<string>> {
  const rows = await loadLiveFeatureHighlightRows();
  return new Set([
    ...RELEASE_FEATURE_HIGHLIGHTS.map((highlight) => highlight.id),
    ...rows.map((row) => row.guid!),
  ]);
}

async function resolveFeatureHighlightSlideMedia(
  slide: FeatureHighlightSlide,
): Promise<FeatureHighlightSlide> {
  if (!slide.media) return slide;
  const [url, posterUrl] = await Promise.all([
    resolveFeatureHighlightMediaUrl(slide.media.url),
    resolveFeatureHighlightMediaUrl(slide.media.posterUrl),
  ]);
  return { ...slide, media: url ? { ...slide.media, url, posterUrl } : null };
}

export async function loadSeenFeatureHighlightIds(
  jwtClaims: string,
  userId: string,
  highlightIds: string[],
): Promise<Set<string>> {
  if (highlightIds.length === 0) return new Set();
  const rows = await authQuery(jwtClaims, (tx) =>
    tx
      .select({ highlightId: featureHighlightViews.highlightId })
      .from(featureHighlightViews)
      .where(
        and(
          eq(featureHighlightViews.userId, userId),
          inArray(featureHighlightViews.highlightId, highlightIds),
        ),
      ),
  );
  return new Set(rows.map((row) => row.highlightId));
}

export async function resolveFeatureHighlightMedia(
  highlight: FeatureHighlight,
): Promise<FeatureHighlight> {
  if (highlight.source !== "admin") return highlight;
  return {
    ...highlight,
    slides: await Promise.all(
      highlight.slides.map(resolveFeatureHighlightSlideMedia),
    ),
  };
}

export function toPersistedFeatureHighlightSlides(
  slides: AdminFeatureHighlightSlideInput[],
): AdminFeatureHighlightSlideInput[] {
  return slides.map((slide) => ({
    ...slide,
    mediaUrl: slide.mediaUrl
      ? toPersistedFeatureHighlightMediaUrl(slide.mediaUrl)
      : null,
    mediaPosterUrl: slide.mediaPosterUrl
      ? toPersistedFeatureHighlightMediaUrl(slide.mediaPosterUrl)
      : null,
  }));
}

export async function toAdminFeatureHighlight(
  row: FeatureHighlightRow,
): Promise<AdminFeatureHighlight> {
  return {
    guid: row.guid!,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt.toISOString(),
    slides: await Promise.all(
      row.slides.map(async (slide) => ({
        ...slide,
        mediaUrl: await resolveFeatureHighlightMediaUrl(slide.mediaUrl),
        mediaPosterUrl: await resolveFeatureHighlightMediaUrl(
          slide.mediaPosterUrl,
        ),
      })),
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
