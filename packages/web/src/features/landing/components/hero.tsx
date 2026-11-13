import { HeroSortingLine } from "@/features/landing/components/hero-sorting-line";
import { LandingStats } from "@/features/landing/components/stats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingHero() {
  const { t } = useTranslation("landing");

  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-14 px-4 pt-16 pb-16 md:gap-20 md:pt-24 md:pb-24">
      <div className="flex flex-col items-center gap-7 text-center">
        <h1 className="max-w-4xl text-5xl leading-[1.02] font-heading font-semibold tracking-tight text-balance animate-in fade-in slide-in-from-bottom-3 duration-700 motion-reduce:animate-none md:text-6xl">
          <Trans
            t={t}
            i18nKey="hero.title"
            components={{
              br: <br />,
              highlight: <span className="text-primary" />,
            }}
          />
        </h1>
        <p className="max-w-2xl text-base/relaxed text-balance text-foreground/70 md:text-lg/relaxed">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
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
        <p className="font-heading text-2xs tracking-widest text-foreground/70 uppercase">
          {t("hero.eyebrow")}
          <span className="hidden sm:inline"> · {t("hero.tagline")}</span>
        </p>
      </div>

      <div className="relative w-full animate-in fade-in slide-in-from-bottom-6 duration-1000 [animation-delay:150ms] [animation-fill-mode:both] motion-reduce:animate-none">
        <div
          aria-hidden
          className="public-glow absolute -inset-x-8 -top-16 bottom-1/3 -z-10 blur-2xl"
        />
        <div className="landing-frame overflow-hidden rounded-lg bg-card">
          <HeroSortingLine />
          <LandingStats />
        </div>
      </div>
    </section>
  );
}
