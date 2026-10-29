import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { usePublicPricing } from "@/features/landing/api/use-public-pricing";
import { PlanBullets } from "@/features/landing/components/plan-bullets";
import { DEFAULT_PUBLIC_PLAN_CONFIG } from "@/lib/constants/pricing";
import { formatPlanPrice, yearlySavingsPercent } from "@/lib/plan-price";
import { cn } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  DEFAULT_BILLING_INTERVAL,
  MAX_CONNECTED_SORTERS,
  type BillingInterval,
} from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MarketingRule } from "@/components/marketing-rule";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function LandingPricing({ step }: MarketingStepProps) {
  const { t, i18n } = useTranslation("landing");
  const pricing = usePublicPricing();
  const plans = pricing?.plans ?? DEFAULT_PUBLIC_PLAN_CONFIG;
  const maxConnectedSorters =
    pricing?.maxConnectedSorters ?? MAX_CONNECTED_SORTERS;

  const [interval, setBillingInterval] = useState<BillingInterval>(
    DEFAULT_BILLING_INTERVAL,
  );
  const monthly = pricing?.business ?? null;
  const yearly = pricing?.businessYearly ?? null;
  const hasYearly = !!monthly && !!yearly;
  const shownPrice = hasYearly && interval === "year" ? yearly : monthly;
  const businessPrice = shownPrice
    ? formatPlanPrice(shownPrice, i18n.language)
    : null;
  const yearlySavings = yearlySavingsPercent(monthly, yearly);

  return (
    <section id="pricing" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("pricing.eyebrow")}
          heading={t("pricing.heading")}
          subtitle={t("pricing.subtitle")}
        />

        {hasYearly && (
          <div className="mt-10 flex">
            <ButtonGroup aria-label={t("pricing.intervals.label")}>
              {BILLING_INTERVALS.map((value) => (
                <Button
                  key={value}
                  variant={interval === value ? "default" : "outline"}
                  aria-pressed={interval === value}
                  onClick={() => setBillingInterval(value)}
                >
                  {t(`pricing.intervals.${value}`)}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        )}

        <div
          className={cn(
            "grid gap-6 sm:grid-cols-2",
            hasYearly ? "mt-6" : "mt-10",
          )}
        >
          <div className="flex flex-col gap-6 rounded-lg border bg-card p-6">
            <div>
              <MarketingRule lead={`${step}.01`} label={t("pricing.free.name")} />
              <p className="mt-5 font-heading text-3xl font-semibold">
                {t("pricing.free.price")}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                {t("pricing.free.description")}
              </p>
            </div>
            <PlanBullets
              settings={plans.free}
              maxConnectedSorters={maxConnectedSorters}
            />
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("getStartedFree")}
            </Link>
          </div>

          <div className="flex flex-col gap-6 rounded-lg border border-primary bg-primary/5 p-6">
            <div>
              <MarketingRule
                lead={`${step}.02`}
                label={t("pricing.business.name")}
                className="border-primary/40"
              />
              <p className="mt-5 font-heading text-3xl font-semibold">
                {businessPrice ?? "-"}
                {businessPrice && (
                  <span className="text-sm font-normal text-foreground/70">
                    {t(
                      shownPrice === yearly
                        ? "pricing.business.perYear"
                        : "pricing.business.perMonth",
                    )}
                  </span>
                )}
              </p>
              {hasYearly && interval === "year" && yearlySavings != null && (
                <p className="mt-1 text-sm font-medium text-success">
                  {t("pricing.business.yearlySavings", {
                    percent: yearlySavings,
                  })}
                </p>
              )}
              <p className="mt-1 text-sm text-foreground/70">
                {t("pricing.business.description")}
              </p>
            </div>
            <PlanBullets
              settings={plans.business}
              maxConnectedSorters={maxConnectedSorters}
              emphasized
            />
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              {t("pricing.business.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
