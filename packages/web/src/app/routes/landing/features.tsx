import { DemoBinDiagram } from "@/app/routes/landing/demo-bin-diagram";
import { DemoCardStrip } from "@/app/routes/landing/demo-card-strip";
import { DemoCollectionSwitcher } from "@/app/routes/landing/demo-collection-switcher";
import { DemoRecognitionPreview } from "@/app/routes/landing/demo-recognition-preview";
import { DemoRuleBuilder } from "@/app/routes/landing/demo-rule-builder";
import { DemoStatsBreakdown } from "@/app/routes/landing/demo-stats-breakdown";
import { useTranslation } from "react-i18next";

const HIGHLIGHTS = [
  { key: "recognition", demo: DemoRecognitionPreview },
  { key: "rules", demo: DemoRuleBuilder },
  { key: "collections", demo: DemoCollectionSwitcher },
  { key: "insights", demo: DemoStatsBreakdown },
  { key: "logging", demo: DemoCardStrip },
  { key: "hardware", demo: DemoBinDiagram },
] as const;

export function LandingFeatures() {
  const { t } = useTranslation("landing");

  return (
    <section id="features" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
            {t("features.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map(({ key, demo: Demo }) => (
            <div
              key={key}
              className="flex flex-col gap-4 rounded-xl bg-muted p-6"
            >
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t(`features.items.${key}.title`)}
                </p>
                <p className="mt-1 text-xs/relaxed text-muted-foreground">
                  {t(`features.items.${key}.description`)}
                </p>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <Demo />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
