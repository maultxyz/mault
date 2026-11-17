import {
  PRICING_COMPARISON_GRID_CLASS,
  PRICING_COMPARISON_ID,
  PRICING_SHARED_FEATURE_KEYS,
} from "@/lib/constants/pricing";
import type {
  PricingComparisonGroup,
  PricingComparisonProps,
} from "@/lib/interfaces/landing";
import { planLimitValue } from "@/lib/plan-bullets";
import { formatPlanPrice, shownPlanPrice } from "@/lib/plan-price";
import { cn } from "@/lib/utils";
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  type PublicPlanKey,
} from "@magic-vault/shared";
import { IconCheck, IconMinus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PricingComparison({
  plans,
  configs,
  maxConnectedSorters,
  highlightedPlan,
  planPrices,
  interval,
}: PricingComparisonProps) {
  const { t, i18n } = useTranslation("landing");
  const gridClass = cn("grid", PRICING_COMPARISON_GRID_CLASS[plans.length]);

  const included = (
    <>
      <IconCheck size={18} className="text-primary" aria-hidden />
      <span className="sr-only">{t("pricing.compare.cells.included")}</span>
    </>
  );
  const notIncluded = (
    <>
      <IconMinus size={18} className="text-foreground/70" aria-hidden />
      <span className="sr-only">{t("pricing.compare.cells.notIncluded")}</span>
    </>
  );

  const priceLabel = (plan: PublicPlanKey) => {
    if (plan === "free") return t("pricing.plans.free.price");
    const { price, isYearly } = shownPlanPrice(
      planPrices?.[plan] ?? null,
      interval,
    );
    if (!price) return null;
    return `${formatPlanPrice(price, i18n.language)}${t(
      isYearly ? "pricing.perYear" : "pricing.perMonth",
    )}`;
  };

  const groups: PricingComparisonGroup[] = [
    {
      key: "limits",
      rows: PLAN_LIMIT_KEYS.map((key) => ({
        key,
        label: t(`pricing.compare.limits.${key}`),
        cells: plans.map((plan) => {
          const limit = planLimitValue(configs[plan], key, maxConnectedSorters);
          if (limit === 0) return notIncluded;
          if (limit == null) return t("pricing.compare.cells.unlimited");
          return limit.toLocaleString(i18n.language);
        }),
      })),
    },
    {
      key: "features",
      rows: PLAN_FEATURE_KEYS.map((key) => ({
        key,
        label: t(`pricing.compare.features.${key}`),
        cells: plans.map((plan) =>
          configs[plan].features[key] ? included : notIncluded,
        ),
      })),
    },
    {
      key: "included",
      rows: PRICING_SHARED_FEATURE_KEYS.map((key) => ({
        key,
        label: t(`pricing.shared.${key}`),
        cells: plans.map(() => included),
      })),
    },
  ];

  const planCellClass = (plan: PublicPlanKey) =>
    cn(
      "flex items-center justify-center px-2 py-2.5 text-center text-sm sm:px-3",
      plan === highlightedPlan && "bg-primary/5",
    );

  return (
    <div id={PRICING_COMPARISON_ID} className="mt-16 scroll-mt-28">
      <h3 className="font-heading text-2xl font-semibold">
        {t("pricing.compare.heading")}
      </h3>
      <p className="mt-2 text-sm text-foreground/70">
        {t("pricing.compare.subtitle")}
      </p>
      <div role="table" className="mt-6 rounded-lg border">
        <div
          role="rowgroup"
          className="sticky top-14 z-10 rounded-t-lg border-b bg-background/95 backdrop-blur-sm"
        >
          <div role="row" className={gridClass}>
            <div
              role="columnheader"
              className="flex items-end px-3 py-3 text-sm font-medium text-foreground/70"
            >
              {t("pricing.compare.feature")}
            </div>
            {plans.map((plan) => (
              <div
                key={plan}
                role="columnheader"
                className={cn(
                  planCellClass(plan),
                  "flex-col gap-0.5 py-3",
                  plan === highlightedPlan && "rounded-t-lg",
                )}
              >
                <span className="font-heading text-sm font-semibold sm:text-base">
                  {t(`pricing.plans.${plan}.name`)}
                </span>
                <span className="text-sm text-foreground/70">
                  {priceLabel(plan) ?? "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
        {groups.map((group) => (
          <div
            key={group.key}
            role="rowgroup"
            className="last:[&>[role=row]:last-child]:border-b-0"
          >
            <div role="row" className="border-b bg-muted/50">
              <div
                role="cell"
                className="px-3 py-2.5 font-heading text-sm font-semibold"
              >
                {t(`pricing.compare.groups.${group.key}`)}
              </div>
            </div>
            {group.rows.map((row) => (
              <div
                key={row.key}
                role="row"
                className={cn(gridClass, "border-b")}
              >
                <div role="rowheader" className="px-3 py-2.5 text-sm">
                  {row.label}
                </div>
                {row.cells.map((cell, index) => (
                  <div
                    key={plans[index]}
                    role="cell"
                    className={planCellClass(plans[index])}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
