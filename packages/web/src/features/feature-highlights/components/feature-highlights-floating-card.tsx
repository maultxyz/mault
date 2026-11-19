import { IconBadge } from "@/components/icon-badge";
import { Button } from "@/components/ui/button";
import { FeatureHighlightCarousel } from "@/features/feature-highlights/components/feature-highlight-carousel";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import {
  FEATURE_HIGHLIGHTS_CARD_CLASS,
  WHATS_NEW_PATH,
} from "@/lib/constants/feature-highlights";
import type { FeatureHighlightsFloatingCardProps } from "@/lib/interfaces/feature-highlights";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function FeatureHighlightsFloatingCard({
  slides,
  onDismiss,
  onOpenTimeline,
}: FeatureHighlightsFloatingCardProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  const cardRef = useRef<HTMLElement>(null);

  const dismiss = () => {
    const card = cardRef.current;
    if (card && card.contains(document.activeElement)) {
      document.getElementById(MAIN_CONTENT_ID)?.focus();
    }
    onDismiss();
  };

  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      dismissRef.current();
    };
    card.addEventListener("keydown", handleKeyDown);
    return () => card.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section
      ref={cardRef}
      aria-labelledby={headingId}
      tabIndex={-1}
      className={FEATURE_HIGHLIGHTS_CARD_CLASS}
    >
      <div className="mb-3 flex items-center gap-2 md:mb-2">
        <IconBadge size="compact" aria-hidden>
          <IconSparkles className="size-4" />
        </IconBadge>
        <h2
          id={headingId}
          className="min-w-0 flex-1 font-heading text-sm font-semibold text-foreground"
        >
          {t("featureHighlights.title")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("a11y.close")}
          onClick={dismiss}
        >
          <IconX aria-hidden />
        </Button>
      </div>
      <FeatureHighlightCarousel slides={slides} onFinish={dismiss} />
      <Button
        variant="link"
        className="mt-2 self-start px-0"
        render={<Link to={WHATS_NEW_PATH} />}
        onClick={onOpenTimeline}
      >
        {t("featureHighlights.seeAll")}
      </Button>
    </section>
  );
}
