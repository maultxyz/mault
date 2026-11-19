import { Badge } from "@/components/ui/badge";
import { FeatureHighlightLinkButton } from "@/features/feature-highlights/components/feature-highlight-link-button";
import { FeatureHighlightMedia } from "@/features/feature-highlights/components/feature-highlight-media";
import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import { FEATURE_HIGHLIGHT_ID_ATTRIBUTE } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightTimelineEntryProps } from "@/lib/interfaces/feature-highlights";
import { cn } from "@/lib/utils";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function FeatureHighlightTimelineEntry({
  highlight,
  isNew,
  isEmphasized,
}: FeatureHighlightTimelineEntryProps) {
  const { t, i18n } = useTranslation("common");
  const titleId = useId();
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  }).format(new Date(highlight.publishedAt));

  return (
    <article
      {...{ [FEATURE_HIGHLIGHT_ID_ATTRIBUTE]: highlight.id }}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "flex scroll-mt-4 flex-col gap-4 rounded-card bg-card p-4 outline-none transition-shadow motion-reduce:transition-none md:gap-3 md:p-2.5",
        isEmphasized && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center gap-2">
        <time
          dateTime={highlight.publishedAt}
          className="text-xs text-foreground/70"
        >
          {date}
        </time>
        {isNew && (
          <Badge variant="default">{t("featureHighlights.timeline.new")}</Badge>
        )}
      </div>
      {highlight.slides.map((slide, index) => (
        <div
          key={`${highlight.id}-${index}`}
          className="flex flex-col gap-3 md:gap-2"
        >
          <FeatureHighlightMedia slide={slide} allowsAutoplay={false} />
          <h3
            id={index === 0 ? titleId : undefined}
            className="font-heading text-base font-semibold text-foreground"
          >
            {resolveFeatureHighlightText(t, slide.title)}
          </h3>
          <p className="text-sm whitespace-pre-line text-foreground/70">
            {resolveFeatureHighlightText(t, slide.body)}
          </p>
          {slide.link && <FeatureHighlightLinkButton link={slide.link} />}
        </div>
      ))}
    </article>
  );
}
