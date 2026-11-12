import { buttonVariants } from "@/components/ui/button";
import { detectDesktopPlatform } from "@/features/download/lib/detect-platform";
import { DESKTOP_DOWNLOADS } from "@/lib/constants/download";
import { useClientValue } from "@/hooks/use-client-value";
import { cn } from "@/lib/utils";
import { IconDeviceDesktopCheck, IconDownload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DownloadHero() {
  const { t } = useTranslation("download");
  const isDesktopApp = useClientValue(() => !!window.maultDesktop, false);
  const platform = useClientValue(detectDesktopPlatform, null);
  const download = DESKTOP_DOWNLOADS.find((item) => item.platform === platform);

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-16 text-center md:pt-24 md:pb-24">
      <p className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
        {t("hero.title")}
      </h1>
      <p className="mt-6 max-w-2xl text-base/relaxed text-balance text-foreground/70 md:text-lg/relaxed">
        {t("hero.description")}
      </p>

      {isDesktopApp ? (
        <p className="mt-8 flex max-w-2xl items-start gap-3 rounded-lg bg-card p-4 text-left text-sm/relaxed ring-1 ring-border">
          <IconDeviceDesktopCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          {t("hero.alreadyInstalled")}
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap justify-center gap-1.5">
            {download ? (
              <>
                <a
                  href={download.href}
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "gap-2",
                  )}
                >
                  <download.icon className="size-4" />
                  {t("hero.downloadFor", {
                    platform: t(`platforms.items.${download.platform}.name`),
                  })}
                </a>
                <a
                  href="#platforms"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                  )}
                >
                  {t("hero.otherPlatforms")}
                </a>
              </>
            ) : (
              <a
                href="#platforms"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "gap-2",
                )}
              >
                <IconDownload className="size-4" />
                {t("hero.choosePlatform")}
              </a>
            )}
          </div>
          <p className="mt-6 max-w-xl text-sm/relaxed text-balance text-foreground/70">
            {t("hero.note")}
          </p>
        </>
      )}
    </section>
  );
}
