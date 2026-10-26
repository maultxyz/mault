import { MarketingRule } from "@/components/marketing-rule";
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
  numberLabel,
  isMirrored,
}: FeatureSpotlightRowProps) {
  const { t } = useTranslation("landing");
  const rowRef = useRef<HTMLElement>(null);
  const isRevealed = useInView(rowRef, {
    observeOnlyUntilFirstVisible: true,
    rootMargin: FEATURE_SPOTLIGHT_REVEAL_ROOT_MARGIN,
  });
  const { key, icon: Icon, demo: Demo, isInteractive, isFullWidth, isNew } =
    spotlight;
  const revealClass = isRevealed
    ? "animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-fill-mode:both] motion-reduce:animate-none"
    : FEATURE_REVEAL_HIDDEN_CLASS;

  return (
    <article
      ref={rowRef}
      className={cn(
        "grid items-center gap-8 py-14 md:py-20",
        !isFullWidth && "lg:gap-12",
        !isFullWidth &&
          (isMirrored
            ? "lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
            : "lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]"),
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-5",
          isFullWidth && "max-w-3xl",
          isMirrored && !isFullWidth && "lg:order-2",
          revealClass,
        )}
      >
        <MarketingRule
          lead={numberLabel}
          aside={
            <>
              {isNew && (
                <span className="rounded-sm border border-primary px-1.5 py-0.5 text-primary">
                  {t("features.new")}
                </span>
              )}
              <Icon className="size-4" />
            </>
          }
        />
        <span
          aria-hidden
          className="feature-spotlight-number font-heading text-8xl font-bold leading-none tracking-tighter text-transparent select-none md:text-9xl"
        >
          {numberLabel.split(".").at(-1)}
        </span>
        <h3 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {t(`features.items.${key}.title`)}
        </h3>
        <p className="max-w-lg text-base/relaxed text-foreground/70">
          {t(`features.items.${key}.description`)}
        </p>
      </div>

      <div style={{ animationDelay: "150ms" }} className={revealClass}>
        <FeatureSpotlightStage
          numberLabel={numberLabel}
          isInteractive={isInteractive ?? false}
        >
          <Demo isRevealed={isRevealed} />
        </FeatureSpotlightStage>
      </div>
    </article>
  );
}
