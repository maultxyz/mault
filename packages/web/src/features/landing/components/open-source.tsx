import { buttonVariants } from "@/components/ui/button";
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
import { LandingSectionHeader } from "@/features/landing/components/section-header";

export function LandingOpenSource() {
  const { t } = useTranslation("landing");

  return (
    <section id="open-source" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <LandingSectionHeader
          eyebrow={t("openSource.eyebrow")}
          heading={t("openSource.heading")}
          subtitle={t("openSource.subtitle")}
        />

        <div className="relative mt-10 grid divide-y divide-border border-t border-border md:grid-cols-3 md:divide-x md:divide-y-0 md:border-t-0">
          <div className="flex flex-col gap-3 py-6 md:px-6 md:py-0 md:pl-0">
            <div className="flex items-start gap-3">
              <IconBrandGithub size={20}
                className="mt-0.5 shrink-0 text-primary"
              />
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t("openSource.sourceCode.title")}
                </p>
                <p className="mt-1 text-sm/relaxed text-foreground/70">
                  {t("openSource.sourceCode.description")}
                </p>
              </div>
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <IconBrandGithub size={16} />
              {t("openSource.sourceCode.cta")}
            </a>
          </div>

          <div className="flex flex-col gap-3 py-6 md:px-6 md:py-0">
            <div className="flex items-start gap-3">
              <IconCube size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t("openSource.printableSorter.title")}
                </p>
                <p className="mt-1 text-sm/relaxed text-foreground/70">
                  {t("openSource.printableSorter.description")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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

          <div className="flex flex-col gap-3 py-6 md:px-6 md:py-0 md:pr-0">
            <div className="flex items-start gap-3">
              <IconBrandDiscord size={20}
                className="mt-0.5 shrink-0 text-primary"
              />
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t("openSource.community.title")}
                </p>
                <p className="mt-1 text-sm/relaxed text-foreground/70">
                  {t("openSource.community.description")}
                </p>
              </div>
            </div>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
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
