import { FeatureSpotlightStage } from "@/features/landing/components/feature-spotlight-stage";
import { useInView } from "@/hooks/use-in-view";
import {
  FEATURE_REVEAL_HIDDEN_CLASS,
  FEATURE_SPOTLIGHT_REVEAL_ROOT_MARGIN,
} from "@/lib/constants/landing";
import type { FeatureSpotlightRowProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function FeatureSpotlightRow({
  spotlight,
  isMirrored,
}: FeatureSpotlightRowProps) {
  const { t } = useTranslation("landing");
  const rowRef = useRef<HTMLElement>(null);
  const isRevealed = useInView(rowRef, {
    observeOnlyUntilFirstVisible: true,
    rootMargin: FEATURE_SPOTLIGHT_REVEAL_ROOT_MARGIN,
  });
  const {
    key,
    icon: Icon,
    demo: Demo,
    isInteractive,
    isFullWidth,
    isNew,
  } = spotlight;
  const revealClass = isRevealed
    ? "animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-fill-mode:both] motion-reduce:animate-none"
    : FEATURE_REVEAL_HIDDEN_CLASS;

  return (
    <article
      ref={rowRef}
      className={cn(
        "grid grid-cols-1 items-center gap-8 py-14 md:py-20",
        !isFullWidth && "lg:gap-14",
        !isFullWidth &&
          (isMirrored
            ? "lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
            : "lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]"),
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          isFullWidth && "mx-auto max-w-2xl items-center text-center",
          isMirrored && !isFullWidth && "lg:order-2",
          revealClass,
        )}
      >
        <p className="flex items-center gap-2 font-heading text-2xs font-medium tracking-widest text-primary uppercase">
          <Icon aria-hidden className="size-4" />
          {isNew && t("features.new")}
        </p>
        <h3 className="text-3xl leading-[1.1] font-heading font-semibold tracking-tight text-balance md:text-4xl">
          {t(`features.items.${key}.title`)}
        </h3>
        <p className="max-w-lg text-base/relaxed text-foreground/70">
          {t(`features.items.${key}.description`)}
        </p>
      </div>

      <div style={{ animationDelay: "150ms" }} className={revealClass}>
        <FeatureSpotlightStage isInteractive={isInteractive ?? false}>
          <Demo isRevealed={isRevealed} />
        </FeatureSpotlightStage>
      </div>
    </article>
  );
}
