import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { LandingSectionHeader } from "@/features/landing/components/section-header";
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

export function LandingPricing() {
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
        <LandingSectionHeader
          eyebrow={t("pricing.eyebrow")}
          heading={t("pricing.heading")}
          subtitle={t("pricing.subtitle")}
          centered
        />

        {hasYearly && (
          <div className="mt-10 flex justify-center">
            <ButtonGroup aria-label={t("pricing.intervals.label")}>
              {BILLING_INTERVALS.map((value) => (
                <Button
                  key={value}
                  size="sm"
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
            "mx-auto grid max-w-4xl gap-6 sm:grid-cols-2",
            hasYearly ? "mt-6" : "mt-10",
          )}
        >
          <div className="flex flex-col gap-6 rounded-xl border p-6">
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("pricing.free.name")}
              </p>
              <p className="mt-3 font-heading text-3xl font-semibold">
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

          <div className="flex flex-col gap-6 rounded-xl border border-primary/50 bg-primary/5 p-6 shadow-sm shadow-primary/10">
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("pricing.business.name")}
              </p>
              <p className="mt-3 font-heading text-3xl font-semibold">
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
