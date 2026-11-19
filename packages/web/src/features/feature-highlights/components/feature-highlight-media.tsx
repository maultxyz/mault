import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { FEATURE_HIGHLIGHT_MEDIA_CLASS } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightMediaProps } from "@/lib/interfaces/feature-highlights";
import { useTranslation } from "react-i18next";

export function FeatureHighlightMedia({ slide }: FeatureHighlightMediaProps) {
  const { t } = useTranslation("common");
  const prefersReducedMotion = usePrefersReducedMotion();
  const media = slide.media;
  if (!media) return null;
  const altText = resolveFeatureHighlightText(t, media.altText);

  if (media.type === "video") {
    return (
      <video
        key={media.url}
        src={media.url}
        poster={media.posterUrl ?? undefined}
        aria-label={altText}
        className={FEATURE_HIGHLIGHT_MEDIA_CLASS}
        muted
        playsInline
        loop
        controls
        autoPlay={!prefersReducedMotion}
        preload="metadata"
      />
    );
  }

  return (
    <img
      key={media.url}
      src={media.url}
      alt={altText}
      className={FEATURE_HIGHLIGHT_MEDIA_CLASS}
      loading="lazy"
      decoding="async"
    />
  );
}
