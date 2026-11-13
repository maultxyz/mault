import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DESKTOP_FEATURE_ICONS } from "@/lib/constants/download";
import type { DesktopDownloadFeature } from "@/lib/interfaces/download";
import { IconDeviceDesktop } from "@tabler/icons-react";
import { MARKETING_CARD_CLASS } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function DownloadFeatures() {
  const { t } = useTranslation("download");
  const features = t("features.items", {
    returnObjects: true,
  }) as DesktopDownloadFeature[];

  return (
    <section id="features" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("features.eyebrow")}
          heading={t("features.title")}
          subtitle={t("features.description")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = DESKTOP_FEATURE_ICONS[i] ?? IconDeviceDesktop;
            return (
              <div
                key={feature.title}
                className={cn(MARKETING_CARD_CLASS, "gap-3")}
              >
                <Icon aria-hidden className="size-5 text-primary" />
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
