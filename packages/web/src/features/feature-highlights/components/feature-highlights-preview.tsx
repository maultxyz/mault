import { IconBadge } from "@/components/icon-badge";
import { FeatureHighlightCarousel } from "@/features/feature-highlights/components/feature-highlight-carousel";
import {
  featureHighlightCarouselSlides,
  previewFeatureHighlightOf,
} from "@/features/feature-highlights/lib/feature-highlight-slides";
import { FEATURE_HIGHLIGHT_PREVIEW_ID } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";
import { IconSparkles } from "@tabler/icons-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function FeatureHighlightsPreview() {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const { control } = useFormContext<FeatureHighlightFormValues>();
  const values = useWatch({ control }) as FeatureHighlightFormValues;
  const slides = featureHighlightCarouselSlides([
    previewFeatureHighlightOf(FEATURE_HIGHLIGHT_PREVIEW_ID, {
      ...values,
      slides: (values.slides ?? []).map((slide) => ({
        ...slide,
        title: slide.title?.trim() || t("featureHighlights.preview.untitled"),
        body: slide.body ?? "",
        mediaUrl: slide.mediaUrl ?? "",
        mediaPosterUrl: slide.mediaPosterUrl ?? "",
        mediaAltText: slide.mediaAltText ?? "",
        linkUrl: slide.linkUrl ?? "",
        linkLabel: slide.linkLabel ?? "",
      })),
    }),
  ]);

  return (
    <section
      aria-label={t("featureHighlights.preview.label")}
      className="flex flex-col gap-2 self-start md:sticky md:top-0"
    >
      <p className="text-xs font-medium text-foreground/70">
        {t("featureHighlights.preview.label")}
      </p>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 shadow-popover ring-1 ring-border md:gap-2">
        <div className="flex items-center gap-2">
          <IconBadge size="compact" aria-hidden>
            <IconSparkles className="size-4" />
          </IconBadge>
          <p className="font-heading text-sm font-semibold text-foreground">
            {tCommon("featureHighlights.title")}
          </p>
        </div>
        <FeatureHighlightCarousel slides={slides} onFinish={() => {}} />
      </div>
    </section>
  );
}
