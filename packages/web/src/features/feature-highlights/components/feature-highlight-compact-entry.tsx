import { Badge } from "@/components/ui/badge";
import { FeatureHighlightMedia } from "@/features/feature-highlights/components/feature-highlight-media";
import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import type { FeatureHighlightCompactEntryProps } from "@/lib/interfaces/feature-highlights";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function FeatureHighlightCompactEntry({
  highlight,
  isNew,
}: FeatureHighlightCompactEntryProps) {
  const { t, i18n } = useTranslation("common");
  const titleId = useId();
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  }).format(new Date(highlight.publishedAt));
  const firstSlide = highlight.slides[0];

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2.5"
    >
      <div className="flex items-center gap-2">
        <time dateTime={highlight.publishedAt} className="text-xs text-foreground/70">
          {date}
        </time>
        {isNew && (
          <Badge variant="default">{t("featureHighlights.timeline.new")}</Badge>
        )}
      </div>
      {firstSlide && (
        <FeatureHighlightMedia slide={firstSlide} allowsAutoplay={false} />
      )}
      {highlight.slides.map((slide, index) => (
        <div key={`${highlight.id}-${index}`} className="flex flex-col gap-0.5">
          <h3
            id={index === 0 ? titleId : undefined}
            className="font-heading text-sm font-semibold text-foreground"
          >
            {resolveFeatureHighlightText(t, slide.title)}
          </h3>
          <p className="line-clamp-3 text-xs text-foreground/70">
            {resolveFeatureHighlightText(t, slide.body)}
          </p>
        </div>
      ))}
    </article>
  );
}
