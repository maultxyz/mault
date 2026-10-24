import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DESKTOP_DOWNLOADS } from "@/lib/constants/download";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";
import { useTranslation } from "react-i18next";

export function DownloadInstall({ step }: MarketingStepProps) {
  const { t } = useTranslation("download");

  return (
    <section id="install" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("install.eyebrow")}
          heading={t("install.title")}
          subtitle={t("install.description")}
        />

        <div className="mt-10 flex flex-col divide-y rounded-lg border bg-card">
          {DESKTOP_DOWNLOADS.map((download) => (
            <div key={download.platform} className="flex gap-4 p-5">
              <download.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="flex flex-col gap-1">
                <p className="font-heading text-sm font-semibold">
                  {t(`install.items.${download.platform}.title`)}
                </p>
                <p className="text-sm/relaxed text-foreground/70">
                  {t(`install.items.${download.platform}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
