import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DESKTOP_FEATURE_ICONS } from "@/lib/constants/download";
import type { DesktopDownloadFeature } from "@/lib/interfaces/download";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";
import { IconDeviceDesktop } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DownloadFeatures({ step }: MarketingStepProps) {
  const { t } = useTranslation("download");
  const features = t("features.items", {
    returnObjects: true,
  }) as DesktopDownloadFeature[];

  return (
    <section id="features" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("features.eyebrow")}
          heading={t("features.title")}
          subtitle={t("features.description")}
        />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = DESKTOP_FEATURE_ICONS[i] ?? IconDeviceDesktop;
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-3 bg-card p-5"
              >
                <Icon className="size-4 text-primary" />
                <div>
                  <p className="font-heading text-sm font-semibold">
                    {feature.title}
                  </p>
                  <p className="text-sm/relaxed text-foreground/70">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
