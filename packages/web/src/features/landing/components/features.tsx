import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { LANDING_FEATURE_HIGHLIGHTS } from "@/features/landing/lib/feature-highlights";
import {
  LANDING_FEATURE_DEMO_CLASS,
  LANDING_FEATURE_EXTRAS,
  LANDING_FEATURE_GRID_CLASS,
  LANDING_FEATURE_TILE_CLASS,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MarketingRule } from "@/components/marketing-rule";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function LandingFeatures({ step }: MarketingStepProps) {
  const { t } = useTranslation("landing");

  return (
    <section id="features">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("features.eyebrow")}
          heading={t("features.heading")}
          subtitle={t("features.subtitle")}
        />

        <div className={LANDING_FEATURE_GRID_CLASS}>
          {LANDING_FEATURE_HIGHLIGHTS.map(
            ({ key, icon: Icon, demo: Demo, className, isNew }, index) => (
              <div key={key} className={cn(LANDING_FEATURE_TILE_CLASS, className)}>
                <MarketingRule
                  lead={`${step}.${String(index + 1).padStart(2, "0")}`}
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
                <div>
                  <h3 className="font-heading text-base font-semibold">
                    {t(`features.items.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm/relaxed text-foreground/70">
                    {t(`features.items.${key}.description`)}
                  </p>
                </div>
                <div className={LANDING_FEATURE_DEMO_CLASS}>
                  <Demo />
                </div>
              </div>
            ),
          )}
        </div>

        <div className="mt-16">
          <h3 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
            {t("features.more.heading")}
          </h3>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_FEATURE_EXTRAS.map(({ key, icon: Icon }) => (
              <div key={key} className="flex flex-col gap-3 bg-card p-5">
                <Icon className="size-4 text-primary" />
                <div>
                  <p className="font-heading text-sm font-semibold">
                    {t(`features.more.items.${key}.title`)}
                  </p>
                  <p className="mt-1 text-sm/relaxed text-foreground/70">
                    {t(`features.more.items.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
