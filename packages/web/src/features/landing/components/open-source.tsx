import { buttonVariants } from "@/components/ui/button";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { MARKETING_CARD_CLASS } from "@/lib/constants/landing";
import { DISCORD_URL, MODEL_URL, REPO_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconCube,
  IconDownload,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingOpenSource() {
  const { t } = useTranslation("landing");

  return (
    <section id="open-source" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("openSource.eyebrow")}
          heading={t("openSource.heading")}
          subtitle={t("openSource.subtitle")}
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className={cn(MARKETING_CARD_CLASS, "gap-4")}>
            <IconBrandGithub aria-hidden className="size-5 text-primary" />
            <h3 className="font-heading text-base font-semibold">
              {t("openSource.sourceCode.title")}
            </h3>
            <p className="text-sm/relaxed text-foreground/70">
              {t("openSource.sourceCode.description")}
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
            >
              <IconBrandGithub size={16} />
              {t("openSource.sourceCode.cta")}
            </a>
          </div>

          <div className={cn(MARKETING_CARD_CLASS, "gap-4")}>
            <IconCube aria-hidden className="size-5 text-primary" />
            <h3 className="font-heading text-base font-semibold">
              {t("openSource.printableSorter.title")}
            </h3>
            <p className="text-sm/relaxed text-foreground/70">
              {t("openSource.printableSorter.description")}
            </p>
            <div className="mt-auto flex flex-wrap gap-1.5">
              <a
                href={MODEL_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <IconDownload size={16} />
                {t("openSource.printableSorter.getModel")}
              </a>
              <Link
                to="/build"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                {t("openSource.printableSorter.buildGuide")}
              </Link>
            </div>
          </div>

          <div className={cn(MARKETING_CARD_CLASS, "gap-4")}>
            <IconBrandDiscord aria-hidden className="size-5 text-primary" />
            <h3 className="font-heading text-base font-semibold">
              {t("openSource.community.title")}
            </h3>
            <p className="text-sm/relaxed text-foreground/70">
              {t("openSource.community.description")}
            </p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
            >
              <IconBrandDiscord size={16} />
              {t("openSource.community.cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
