import {
  FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH,
  FEATURE_HIGHLIGHT_BODY_MAX_LENGTH,
  FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH,
  FEATURE_HIGHLIGHT_MAX_SLIDES,
  FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH,
  formValidationMessage,
} from "@magic-vault/shared";
import { z } from "zod";

export function isFeatureHighlightLinkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isFeatureHighlightMediaUrl(value: string): boolean {
  return value.startsWith("data:image/") || isFeatureHighlightLinkUrl(value);
}

function requiredText(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, formValidationMessage("valueRequired"))
    .max(maxLength, formValidationMessage("textTooLong", { max: maxLength }));
}

const featureHighlightSlideFormSchema = z
  .object({
    title: requiredText(FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH),
    body: requiredText(FEATURE_HIGHLIGHT_BODY_MAX_LENGTH),
    mediaType: z.enum(["none", "image", "video"]),
    mediaUrl: z.string().trim(),
    mediaPosterUrl: z.string().trim(),
    mediaAltText: z
      .string()
      .trim()
      .max(
        FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH,
        formValidationMessage("textTooLong", {
          max: FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH,
        }),
      ),
    linkUrl: z.string().trim(),
    linkLabel: z
      .string()
      .trim()
      .max(
        FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH,
        formValidationMessage("textTooLong", {
          max: FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH,
        }),
      ),
  })
  .superRefine((slide, ctx) => {
    if (slide.mediaType !== "none") {
      if (!slide.mediaUrl) {
        ctx.addIssue({
          code: "custom",
          message: formValidationMessage("valueRequired"),
          path: ["mediaUrl"],
        });
      } else if (!isFeatureHighlightMediaUrl(slide.mediaUrl)) {
        ctx.addIssue({
          code: "custom",
          message: formValidationMessage("shortLinkTargetInvalid"),
          path: ["mediaUrl"],
        });
      }
      if (!slide.mediaAltText) {
        ctx.addIssue({
          code: "custom",
          message: formValidationMessage("valueRequired"),
          path: ["mediaAltText"],
        });
      }
    }
    if (
      slide.mediaType === "video" &&
      slide.mediaPosterUrl &&
      !isFeatureHighlightMediaUrl(slide.mediaPosterUrl)
    ) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("shortLinkTargetInvalid"),
        path: ["mediaPosterUrl"],
      });
    }
    if (slide.linkUrl && !isFeatureHighlightLinkUrl(slide.linkUrl)) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("shortLinkTargetInvalid"),
        path: ["linkUrl"],
      });
    }
    if (slide.linkUrl && !slide.linkLabel) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("valueRequired"),
        path: ["linkLabel"],
      });
    }
    if (slide.linkLabel && !slide.linkUrl) {
      ctx.addIssue({
        code: "custom",
        message: formValidationMessage("valueRequired"),
        path: ["linkUrl"],
      });
    }
  });

export const featureHighlightFormSchema = z.object({
  isPublished: z.boolean(),
  publishedAt: z
    .string()
    .min(1, formValidationMessage("valueRequired"))
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      formValidationMessage("valueRequired"),
    ),
  slides: z
    .array(featureHighlightSlideFormSchema)
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(
      FEATURE_HIGHLIGHT_MAX_SLIDES,
      formValidationMessage("atMost", { max: FEATURE_HIGHLIGHT_MAX_SLIDES }),
    ),
});

export type FeatureHighlightFormValues = z.infer<
  typeof featureHighlightFormSchema
>;

export type FeatureHighlightSlideFormValues =
  FeatureHighlightFormValues["slides"][number];
