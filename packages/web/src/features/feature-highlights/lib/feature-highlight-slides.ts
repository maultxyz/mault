import type {
  AdminFeatureHighlight,
  AdminFeatureHighlightInput,
  FeatureHighlight,
  FeatureHighlightText,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { EMPTY_FEATURE_HIGHLIGHT_SLIDE } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightCarouselSlide } from "@/lib/interfaces/feature-highlights";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";

export function resolveFeatureHighlightText(
  t: TFunction<"common">,
  text: FeatureHighlightText,
): string {
  return text.kind === "translated" ? t(text.key) : text.value;
}

export function featureHighlightCarouselSlides(
  highlights: FeatureHighlight[],
): FeatureHighlightCarouselSlide[] {
  return highlights.flatMap((highlight) =>
    highlight.slides.map((slide, index) => ({
      key: `${highlight.id}-${index}`,
      highlightId: highlight.id,
      slide,
    })),
  );
}

export function unseenHighlightIdsOf(
  slides: FeatureHighlightCarouselSlide[],
  seenHighlightIds: string[],
): string[] {
  const seen = new Set(seenHighlightIds);
  return [...new Set(slides.map((slide) => slide.highlightId))].filter(
    (highlightId) => !seen.has(highlightId),
  );
}

function literal(value: string): FeatureHighlightText {
  return { kind: "literal", value };
}

function toDatetimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function featureHighlightFormValuesOf(
  highlight: AdminFeatureHighlight | null,
  now: Date,
): FeatureHighlightFormValues {
  if (!highlight) {
    return {
      isPublished: false,
      publishedAt: toDatetimeLocalValue(now.toISOString()),
      slides: [{ ...EMPTY_FEATURE_HIGHLIGHT_SLIDE }],
    };
  }
  return {
    isPublished: highlight.isPublished,
    publishedAt: toDatetimeLocalValue(highlight.publishedAt),
    slides: highlight.slides.map((slide) => ({
      title: slide.title,
      body: slide.body,
      mediaType: slide.mediaType ?? "none",
      mediaUrl: slide.mediaUrl ?? "",
      mediaPosterUrl: slide.mediaPosterUrl ?? "",
      mediaAltText: slide.mediaAltText,
      linkUrl: slide.linkUrl ?? "",
      linkLabel: slide.linkLabel,
    })),
  };
}

export function adminFeatureHighlightInputOf(
  values: FeatureHighlightFormValues,
): AdminFeatureHighlightInput {
  return {
    isPublished: values.isPublished,
    publishedAt: new Date(values.publishedAt).toISOString(),
    slides: values.slides.map((slide) => {
      const mediaType = slide.mediaType === "none" ? null : slide.mediaType;
      const linkUrl = slide.linkUrl.trim() || null;
      return {
        title: slide.title.trim(),
        body: slide.body.trim(),
        mediaType,
        mediaUrl: mediaType ? slide.mediaUrl.trim() || null : null,
        mediaPosterUrl:
          mediaType === "video" ? slide.mediaPosterUrl.trim() || null : null,
        mediaAltText: mediaType ? slide.mediaAltText.trim() : "",
        linkUrl,
        linkLabel: linkUrl ? slide.linkLabel.trim() : "",
      };
    }),
  };
}

export function previewFeatureHighlightOf(
  id: string,
  values: FeatureHighlightFormValues,
): FeatureHighlight {
  return {
    id,
    source: "admin",
    publishedAt: values.publishedAt,
    slides: values.slides.map((slide) => {
      const mediaUrl = slide.mediaUrl.trim();
      const linkUrl = slide.linkUrl.trim();
      return {
        title: literal(slide.title),
        body: literal(slide.body),
        media:
          slide.mediaType !== "none" && mediaUrl
            ? {
                type: slide.mediaType,
                url: mediaUrl,
                posterUrl:
                  slide.mediaType === "video"
                    ? slide.mediaPosterUrl.trim() || null
                    : null,
                altText: literal(slide.mediaAltText),
              }
            : null,
        link: linkUrl
          ? { url: linkUrl, label: literal(slide.linkLabel) }
          : null,
      };
    }),
  };
}
