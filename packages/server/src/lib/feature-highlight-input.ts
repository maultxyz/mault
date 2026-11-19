import {
  FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH,
  FEATURE_HIGHLIGHT_BODY_MAX_LENGTH,
  FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES,
  FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH,
  FEATURE_HIGHLIGHT_MAX_SLIDES,
  FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH,
  type AdminFeatureHighlightInput,
  type AdminFeatureHighlightSlideInput,
  type FeatureHighlightMediaType,
} from "@magic-vault/shared";
import { z } from "zod";
import {
  FEATURE_HIGHLIGHT_ID_MAX_LENGTH,
  FEATURE_HIGHLIGHT_SEEN_MAX_IDS,
  FEATURE_HIGHLIGHT_URL_MAX_LENGTH,
} from "./constants/feature-highlights";
import {
  featureHighlightDataUrlImageBytes,
  isHttpUrl,
  storedFeatureHighlightMediaKeyOf,
} from "./feature-highlight-media";

const optionalUrlSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value ?? null,
  z.string().trim().nullable(),
);

function mediaUrlProblem(
  url: string,
  mediaType: FeatureHighlightMediaType,
): string | null {
  if (storedFeatureHighlightMediaKeyOf(url)) return null;
  if (url.startsWith("data:")) {
    if (mediaType !== "image") {
      return "Videos must be uploaded or linked by URL.";
    }
    const bytes = featureHighlightDataUrlImageBytes(url);
    if (bytes === null) return "Use a PNG, JPEG, WebP or GIF image.";
    if (bytes > FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES) {
      return "The image is too large.";
    }
    return null;
  }
  if (url.length > FEATURE_HIGHLIGHT_URL_MAX_LENGTH || !isHttpUrl(url)) {
    return "Media URLs must start with http:// or https://.";
  }
  return null;
}

export const adminFeatureHighlightSlideSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Every slide needs a title.")
      .max(FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH, "The title is too long."),
    body: z
      .string()
      .trim()
      .min(1, "Every slide needs body text.")
      .max(FEATURE_HIGHLIGHT_BODY_MAX_LENGTH, "The body text is too long."),
    mediaType: z.enum(["image", "video"]).nullable().default(null),
    mediaUrl: optionalUrlSchema,
    mediaPosterUrl: optionalUrlSchema,
    mediaAltText: z
      .string()
      .trim()
      .max(FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH, "The alt text is too long.")
      .default(""),
    linkUrl: optionalUrlSchema,
    linkLabel: z
      .string()
      .trim()
      .max(FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH, "The link label is too long.")
      .default(""),
  })
  .superRefine((slide, context) => {
    const addIssue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (slide.mediaType && !slide.mediaUrl) {
      addIssue("mediaUrl", "Add the media file or URL.");
    }
    if (slide.mediaUrl && !slide.mediaType) {
      addIssue("mediaType", "Pick whether the media is an image or a video.");
    }
    if (slide.mediaUrl && slide.mediaType) {
      const problem = mediaUrlProblem(slide.mediaUrl, slide.mediaType);
      if (problem) addIssue("mediaUrl", problem);
      if (!slide.mediaAltText) {
        addIssue("mediaAltText", "Describe the media for screen readers.");
      }
    }
    if (slide.mediaPosterUrl) {
      if (slide.mediaType !== "video") {
        addIssue("mediaPosterUrl", "Only videos have a poster image.");
      } else {
        const problem = mediaUrlProblem(slide.mediaPosterUrl, "image");
        if (problem) addIssue("mediaPosterUrl", problem);
      }
    }
    if (slide.linkUrl) {
      if (
        slide.linkUrl.length > FEATURE_HIGHLIGHT_URL_MAX_LENGTH ||
        !isHttpUrl(slide.linkUrl)
      ) {
        addIssue("linkUrl", "Links must start with http:// or https://.");
      }
      if (!slide.linkLabel) addIssue("linkLabel", "Give the link a label.");
    }
  })
  .transform((slide): AdminFeatureHighlightSlideInput => {
    const hasMedia = !!slide.mediaType && !!slide.mediaUrl;
    const hasLink = !!slide.linkUrl;
    return {
      title: slide.title,
      body: slide.body,
      mediaType: hasMedia ? slide.mediaType : null,
      mediaUrl: hasMedia ? slide.mediaUrl : null,
      mediaPosterUrl: hasMedia ? slide.mediaPosterUrl : null,
      mediaAltText: hasMedia ? slide.mediaAltText : "",
      linkUrl: hasLink ? slide.linkUrl : null,
      linkLabel: hasLink ? slide.linkLabel : "",
    };
  });

export const adminFeatureHighlightInputSchema = z
  .object({
    isPublished: z.boolean(),
    publishedAt: z
      .string()
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Invalid publish time.",
      )
      .transform((value) => new Date(value).toISOString()),
    slides: z
      .array(adminFeatureHighlightSlideSchema)
      .min(1, "Add at least one slide.")
      .max(FEATURE_HIGHLIGHT_MAX_SLIDES, "Too many slides."),
  })
  .transform((input): AdminFeatureHighlightInput => input);

export const markFeatureHighlightsSeenSchema = z.object({
  highlightIds: z
    .array(z.string().min(1).max(FEATURE_HIGHLIGHT_ID_MAX_LENGTH))
    .max(FEATURE_HIGHLIGHT_SEEN_MAX_IDS),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}
