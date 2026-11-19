import { Button } from "@/components/ui/button";
import { FeatureHighlightMedia } from "@/features/feature-highlights/components/feature-highlight-media";
import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import { FEATURE_HIGHLIGHT_INTERACTIVE_KEY_TARGETS } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightCarouselProps } from "@/lib/interfaces/feature-highlights";
import { cn } from "@/lib/utils";
import { IconExternalLink } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function FeatureHighlightCarousel({
  slides,
  onFinish,
}: FeatureHighlightCarouselProps) {
  const { t } = useTranslation("common");
  const [requestedIndex, setRequestedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  const total = slides.length;
  const index = Math.min(requestedIndex, Math.max(total - 1, 0));
  const current = slides[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= total || nextIndex === index) return;
    if (nextIndex === 0 && document.activeElement === backButtonRef.current) {
      nextButtonRef.current?.focus();
    }
    setRequestedIndex(nextIndex);
    setAnnouncement(
      t("featureHighlights.slideAnnouncement", {
        current: nextIndex + 1,
        total,
        title: resolveFeatureHighlightText(t, slides[nextIndex].slide.title),
      }),
    );
  };

  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (FEATURE_HIGHLIGHT_INTERACTIVE_KEY_TARGETS.has(target.tagName) ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToRef.current(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToRef.current(index + 1);
      }
    };
    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [index]);

  if (!current) return null;

  const title = resolveFeatureHighlightText(t, current.slide.title);
  const body = resolveFeatureHighlightText(t, current.slide.body);
  const link = current.slide.link;
  const linkLabel =
    (link && resolveFeatureHighlightText(t, link.label).trim()) ||
    t("featureHighlights.learnMore");
  const isInternalLink =
    !!link && link.url.startsWith("/") && !link.url.startsWith("//");
  const step = t("featureHighlights.step", { current: index + 1, total });

  return (
    <div ref={rootRef} className="flex flex-col gap-4 md:gap-3">
      <div
        key={current.key}
        role="group"
        aria-roledescription={t("featureHighlights.slideRoleDescription")}
        aria-label={step}
        className="flex flex-col gap-3 md:gap-2 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
      >
        <FeatureHighlightMedia slide={current.slide} />
        <h3 className="font-heading text-base font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm whitespace-pre-line text-foreground/70">{body}</p>
        {link &&
          (isInternalLink ? (
            <Button
              variant="secondary"
              className="self-start"
              nativeButton={false}
              render={<Link to={link.url} />}
            >
              {linkLabel}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="self-start"
              nativeButton={false}
              render={
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${linkLabel}, ${t("featureHighlights.opensInBrowser")}`}
                />
              }
            >
              {linkLabel}
              <IconExternalLink aria-hidden />
            </Button>
          ))}
      </div>

      <div className="flex flex-col gap-3 md:gap-2">
        {total > 1 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground/70">{step}</span>
            <span aria-hidden className="flex items-center gap-1">
              {slides.map((slide, dotIndex) => (
                <span
                  key={slide.key}
                  className={cn(
                    "h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none",
                    dotIndex === index
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-foreground/25",
                  )}
                />
              ))}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <Button
              ref={backButtonRef}
              variant="secondary"
              className="flex-1"
              onClick={() => goTo(index - 1)}
            >
              {t("featureHighlights.back")}
            </Button>
          )}
          <Button
            ref={nextButtonRef}
            className="flex-1"
            onClick={() => (isLast ? onFinish() : goTo(index + 1))}
          >
            {isLast ? t("featureHighlights.gotIt") : t("featureHighlights.next")}
          </Button>
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
