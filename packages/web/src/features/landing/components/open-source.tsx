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
import { MarketingRule } from "@/components/marketing-rule";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function LandingOpenSource({ step }: MarketingStepProps) {
  const { t } = useTranslation("landing");

  return (
    <section id="open-source" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("openSource.eyebrow")}
          heading={t("openSource.heading")}
          subtitle={t("openSource.subtitle")}
        />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border md:grid-cols-3">
          <div className="flex flex-col gap-4 bg-card p-6">
            <MarketingRule
              lead={`${step}.01`}
              label={t("openSource.sourceCode.title")}
              aside={<IconBrandGithub className="size-4" />}
            />
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

          <div className="flex flex-col gap-4 bg-card p-6">
            <MarketingRule
              lead={`${step}.02`}
              label={t("openSource.printableSorter.title")}
              aside={<IconCube className="size-4" />}
            />
            <p className="text-sm/relaxed text-foreground/70">
              {t("openSource.printableSorter.description")}
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
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

          <div className="flex flex-col gap-4 bg-card p-6">
            <MarketingRule
              lead={`${step}.03`}
              label={t("openSource.community.title")}
              aside={<IconBrandDiscord className="size-4" />}
            />
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
