import { buttonVariants } from "@/components/ui/button";
import { PlanBullets } from "@/features/landing/components/plan-bullets";
import type { PricingPlanCardProps } from "@/lib/interfaces/landing";
import {
  formatPlanPrice,
  shownPlanPrice,
  yearlySavingsPercent,
} from "@/lib/plan-price";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PricingPlanCard({
  plan,
  settings,
  maxConnectedSorters,
  prices,
  interval,
  emphasized,
}: PricingPlanCardProps) {
  const { t, i18n } = useTranslation("landing");
  const isFree = plan === "free";
  const { price: shownPrice, isYearly: isYearlyPrice } = shownPlanPrice(
    prices,
    interval,
  );
  const yearlySavings = isYearlyPrice
    ? yearlySavingsPercent(prices?.month, prices?.year)
    : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-lg p-6",
        "bg-card",
        emphasized ? "ring-2 ring-primary" : "ring-1 ring-border",
      )}
    >
      <div>
        <h3
          className={cn("font-heading text-sm font-semibold", emphasized && "text-primary")}
        >
          {t(`pricing.plans.${plan}.name`)}
        </h3>
        <p className="mt-4 text-4xl font-heading font-semibold tracking-tight">
          {isFree
            ? t("pricing.plans.free.price")
            : shownPrice
              ? formatPlanPrice(shownPrice, i18n.language)
              : "-"}
          {shownPrice && (
            <span className="text-sm font-normal text-foreground/70">
              {t(isYearlyPrice ? "pricing.perYear" : "pricing.perMonth")}
            </span>
          )}
        </p>
        {yearlySavings != null && (
          <p className="mt-1 text-sm font-medium text-success-foreground">
            {t("pricing.yearlySavings", { percent: yearlySavings })}
          </p>
        )}
        <p className="mt-1 text-sm text-foreground/70">
          {t(`pricing.plans.${plan}.description`)}
        </p>
      </div>
      <PlanBullets
        settings={settings}
        maxConnectedSorters={maxConnectedSorters}
        emphasized={emphasized}
      />
      <Link
        to="/auth/sign-up"
        className={cn(
          buttonVariants({ variant: emphasized ? "default" : "outline" }),
        )}
      >
        {t(`pricing.plans.${plan}.cta`)}
      </Link>
    </div>
  );
}
