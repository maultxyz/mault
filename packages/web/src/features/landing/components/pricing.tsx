import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { usePublicPricing } from "@/features/landing/api/use-public-pricing";
import { PricingPlanCard } from "@/features/landing/components/pricing-plan-card";
import {
  DEFAULT_PUBLIC_PLAN_CONFIG,
  PRICING_GRID_COLUMNS_CLASS,
  PRICING_HIGHLIGHTED_PLAN,
} from "@/lib/constants/pricing";
import { cn } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  DEFAULT_BILLING_INTERVAL,
  MAX_CONNECTED_SORTERS,
  PAID_PLAN_KEYS,
  PLAN_KEYS,
  type BillingInterval,
} from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function LandingPricing({ step }: MarketingStepProps) {
  const { t } = useTranslation("landing");
  const pricing = usePublicPricing();
  const plans = pricing?.plans ?? DEFAULT_PUBLIC_PLAN_CONFIG;
  const planPrices = pricing?.planPrices ?? null;
  const maxConnectedSorters =
    pricing?.maxConnectedSorters ?? MAX_CONNECTED_SORTERS;

  const [interval, setBillingInterval] = useState<BillingInterval>(
    DEFAULT_BILLING_INTERVAL,
  );
  const visiblePlans = PLAN_KEYS.filter(
    (plan) =>
      plan === "free" ||
      !planPrices ||
      !!planPrices[plan].month ||
      !!planPrices[plan].year,
  );
  const hasYearly =
    !!planPrices &&
    PAID_PLAN_KEYS.some(
      (plan) => !!planPrices[plan].month && !!planPrices[plan].year,
    );

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
            "grid gap-6",
            PRICING_GRID_COLUMNS_CLASS[visiblePlans.length],
            hasYearly ? "mt-6" : "mt-10",
          )}
        >
          {visiblePlans.map((plan, index) => (
            <PricingPlanCard
              key={plan}
              plan={plan}
              lead={`${step}.${String(index + 1).padStart(2, "0")}`}
              settings={plans[plan]}
              maxConnectedSorters={maxConnectedSorters}
              prices={plan === "free" ? null : (planPrices?.[plan] ?? null)}
              interval={interval}
              emphasized={plan === PRICING_HIGHLIGHTED_PLAN}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
