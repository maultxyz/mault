import { buttonVariants } from "@/components/ui/button";
import { MarketingRule } from "@/components/marketing-rule";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
      <div className="flex flex-col gap-8 rounded-lg bg-primary p-6 text-primary-foreground md:p-10">
        <MarketingRule
          lead="Mault"
          label={t("cta.eyebrow")}
          className="border-primary-foreground/25 text-primary-foreground/80 [&_span]:text-primary-foreground"
        />
        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
          <div className="flex flex-col gap-3 md:col-span-8">
            <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
              {t("cta.heading")}
            </h2>
            <p className="max-w-md text-sm/relaxed text-primary-foreground/80 md:text-base/relaxed">
              {t("cta.subtitle")}
            </p>
          </div>
          <div className="md:col-span-4 md:flex md:justify-end">
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              {t("getStartedFree")}
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
