import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DESKTOP_DOWNLOADS } from "@/lib/constants/download";
import { useTranslation } from "react-i18next";

export function DownloadInstall() {
  const { t } = useTranslation("download");

  return (
    <section id="install" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("install.eyebrow")}
          heading={t("install.title")}
          subtitle={t("install.description")}
        />

        <div className="mx-auto mt-12 flex max-w-3xl flex-col divide-y rounded-lg bg-card ring-1 ring-border">
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
