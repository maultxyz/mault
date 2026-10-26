import { HeroSortingLine } from "@/features/landing/components/hero-sorting-line";
import { MarketingRule } from "@/components/marketing-rule";
import { LandingStats } from "@/features/landing/components/stats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingHero() {
  const { t } = useTranslation("landing");

  return (
    <section className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-14 pb-16 md:gap-14 md:pt-20 md:pb-20">
      <div className="flex flex-col items-start gap-8">
        <MarketingRule
          lead="Mault"
          label={t("hero.eyebrow")}
          aside={<span className="hidden sm:inline">{t("hero.tagline")}</span>}
        />
        <h1 className="max-w-4xl font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-balance md:text-6xl">
          <Trans
            t={t}
            i18nKey="hero.title"
            components={{
              br: <br />,
              highlight: <span className="text-primary" />,
            }}
          />
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/auth/sign-up"
            className={cn(buttonVariants({ variant: "default", size: "lg" }))}
          >
            {t("getStartedFree")}
            <IconArrowRight size={16} />
          </Link>
          <a
            href="#features"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {t("hero.seeFeatures")}
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <HeroSortingLine />
        <LandingStats />
      </div>
    </section>
  );
}
