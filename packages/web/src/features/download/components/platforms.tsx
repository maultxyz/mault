import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { buttonVariants } from "@/components/ui/button";
import { detectDesktopPlatform } from "@/features/download/lib/detect-platform";
import {
  DESKTOP_DOWNLOADS,
  DESKTOP_RELEASE_URL,
} from "@/lib/constants/download";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";
import { cn } from "@/lib/utils";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DownloadPlatforms({ step }: MarketingStepProps) {
  const { t } = useTranslation("download");
  const detected = detectDesktopPlatform();

  return (
    <section id="platforms" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("platforms.eyebrow")}
          heading={t("platforms.title")}
          subtitle={t("platforms.description")}
        />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-3">
          {DESKTOP_DOWNLOADS.map((download) => {
            const isDetected = download.platform === detected;
            return (
              <div
                key={download.platform}
                className="flex flex-col gap-4 bg-card p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <download.icon className="size-5 text-primary" />
                  {isDetected && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                      {t("platforms.yourSystem")}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-heading text-base font-semibold">
                    {t(`platforms.items.${download.platform}.name`)}
                  </p>
                  <p className="text-sm/relaxed text-foreground/70">
                    {t(`platforms.items.${download.platform}.requirements`)}
                  </p>
                  <p className="text-sm/relaxed text-foreground/70">
                    {t(`platforms.items.${download.platform}.file`)}
                  </p>
                </div>
                <a
                  href={download.href}
                  className={cn(
                    buttonVariants({
                      variant: isDetected ? "default" : "outline",
                      size: "lg",
                    }),
                    "gap-2",
                  )}
                >
                  <IconDownload className="size-4" />
                  {t("platforms.download")}
                </a>
              </div>
            );
          })}
        </div>

        <a
          href={DESKTOP_RELEASE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground"
        >
          <IconExternalLink className="size-4" />
          {t("platforms.allReleases")}
        </a>
      </div>
    </section>
  );
}
