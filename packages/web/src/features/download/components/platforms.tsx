import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { buttonVariants } from "@/components/ui/button";
import { detectDesktopPlatform } from "@/features/download/lib/detect-platform";
import { useClientValue } from "@/hooks/use-client-value";
import {
  DESKTOP_DOWNLOADS,
  DESKTOP_RELEASE_URL,
} from "@/lib/constants/download";
import { MARKETING_CARD_CLASS } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DownloadPlatforms() {
  const { t } = useTranslation("download");
  const detected = useClientValue(detectDesktopPlatform, null);

  return (
    <section id="platforms" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("platforms.eyebrow")}
          heading={t("platforms.title")}
          subtitle={t("platforms.description")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {DESKTOP_DOWNLOADS.map((download) => {
            const isDetected = download.platform === detected;
            return (
              <div
                key={download.platform}
                className={cn(
                  MARKETING_CARD_CLASS,
                  "gap-4",
                  isDetected && "ring-2 ring-primary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <download.icon aria-hidden className="size-5 text-primary" />
                  {isDetected && (
                    <span className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-foreground/70">
          <p>{t("platforms.macosSoon")}</p>
          <a
            href={DESKTOP_RELEASE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <IconExternalLink className="size-4" />
            {t("platforms.allReleases")}
          </a>
        </div>
      </div>
    </section>
  );
}
