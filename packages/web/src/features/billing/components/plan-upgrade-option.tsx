import { Button } from "@/components/ui/button";
import type { PlanUpgradeOptionProps } from "@/lib/interfaces/billing";
import { formatPlanPrice, yearlySavingsPercent } from "@/lib/plan-price";
import { BILLING_INTERVALS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PlanUpgradeOption({
  plan,
  prices,
  isStartingCheckout,
  onCheckout,
}: PlanUpgradeOptionProps) {
  const { t, i18n } = useTranslation("billing");
  const yearlySavings = yearlySavingsPercent(prices.month, prices.year);

  return (
    <div className="flex flex-col gap-2 rounded-lg p-3 ring-1 ring-border">
      <p className="text-sm font-medium">
        {t("upgradeTo", { plan: t(`plan.${plan}`) })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {BILLING_INTERVALS.map((interval) => {
          const price = prices[interval];
          if (!price) return null;
          return (
            <Button
              key={interval}
              variant={interval === "year" ? "default" : "outline"}
              onClick={() => onCheckout({ plan, interval })}
              disabled={isStartingCheckout}
            >
              {t(interval === "year" ? "upgradeYearly" : "upgradeMonthly", {
                price: formatPlanPrice(price, i18n.language),
              })}
            </Button>
          );
        })}
      </div>
      {yearlySavings != null && (
        <p className="text-xs text-foreground/70">
          {t("yearlySavings", { percent: yearlySavings })}
        </p>
      )}
    </div>
  );
}
