import { LandingSectionHeader } from "@/features/landing/components/section-header";
import { LANDING_FEATURE_HIGHLIGHTS } from "@/features/landing/lib/feature-highlights";
import {
  LANDING_FEATURE_DEMO_CLASS,
  LANDING_FEATURE_EXTRAS,
  LANDING_FEATURE_GRID_CLASS,
  LANDING_FEATURE_TILE_CLASS,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function LandingFeatures() {
  const { t } = useTranslation("landing");

  return (
    <section id="features" className="border-y bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <LandingSectionHeader
          eyebrow={t("features.eyebrow")}
          heading={t("features.heading")}
          subtitle={t("features.subtitle")}
        />

        <div className={LANDING_FEATURE_GRID_CLASS}>
          {LANDING_FEATURE_HIGHLIGHTS.map(
            ({ key, icon: Icon, demo: Demo, className, isNew }) => (
              <div key={key} className={cn(LANDING_FEATURE_TILE_CLASS, className)}>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">
                        {t(`features.items.${key}.title`)}
                      </h3>
                      {isNew && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">
                          {t("features.new")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm/relaxed text-foreground/70">
                      {t(`features.items.${key}.description`)}
                    </p>
                  </div>
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
          <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_FEATURE_EXTRAS.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-start gap-3">
                <Icon size={20} className="mt-0.5 shrink-0 text-primary" />
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
