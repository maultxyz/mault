import { buttonVariants } from "@/components/ui/button";
import { DISCORD_URL, MODEL_URL, REPO_URL } from "@/lib/links";
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
    <section id="open-source" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
            {t("openSource.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-foreground/70 md:text-base/relaxed">
            {t("openSource.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid divide-y divide-border border-t border-border md:grid-cols-3 md:divide-x md:divide-y-0 md:border-t-0">
          <div className="flex flex-col gap-3 py-6 md:px-6 md:py-0 md:pl-0">
            <div className="flex items-start gap-3">
              <IconBrandGithub
                size={20}
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
              <IconBrandDiscord
                size={20}
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
