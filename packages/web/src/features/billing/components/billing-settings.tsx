import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPlanPrice, yearlySavingsPercent } from "@/lib/plan-price";
import { DEFAULT_BILLING_INTERVAL } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useBilling } from "../api/use-billing";
import { PlanFeatures } from "./plan-features";

export function BillingSettings() {
  const { t, i18n } = useTranslation("billing");
  const {
    billing,
    isLoading,
    canManage,
    startCheckout,
    isStartingCheckout,
    openPortal,
    isOpeningPortal,
  } = useBilling();

  if (isLoading || !billing) return null;

  const isBusiness = billing.plan === "business";
  const usagePercent =
    billing.dailyLimit != null
      ? Math.min(
          100,
          Math.round((billing.cardsScannedToday / billing.dailyLimit) * 100),
        )
      : 0;
  const monthlyPrice = billing.prices?.month ?? null;
  const yearlyPrice = billing.prices?.year ?? null;
  const yearlySavings = yearlySavingsPercent(monthlyPrice, yearlyPrice);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Badge variant={isBusiness ? "success" : "secondary"}>
          {t(isBusiness ? "plan.business" : "plan.free")}
        </Badge>
      </div>

      <PlanFeatures billing={billing} />

      {!isBusiness && billing.dailyLimit != null && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-foreground/70">
            {t("usage", {
              used: billing.cardsScannedToday,
              limit: billing.dailyLimit,
            })}
          </p>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {isBusiness && billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
        <p className="text-xs text-foreground/70">
          {t("cancelAtPeriodEnd", {
            date: new Date(billing.currentPeriodEnd).toLocaleDateString(),
          })}
        </p>
      )}

      {isBusiness && billing.interval && !billing.cancelAtPeriodEnd && (
        <p className="text-xs text-foreground/70">
          {t(billing.interval === "year" ? "billedYearly" : "billedMonthly")}
        </p>
      )}

      {canManage && (
        <div>
          {isBusiness ? (
            <Button
              variant="outline"
              onClick={openPortal}
              disabled={isOpeningPortal}
            >
              {t("manage")}
            </Button>
          ) : yearlyPrice ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  onClick={() => startCheckout("month")}
                  disabled={isStartingCheckout}
                >
                  {monthlyPrice
                    ? t("upgradeMonthly", {
                        price: formatPlanPrice(monthlyPrice, i18n.language),
                      })
                    : t("upgrade")}
                </Button>
                <Button
                  onClick={() => startCheckout("year")}
                  disabled={isStartingCheckout}
                >
                  {t("upgradeYearly", {
                    price: formatPlanPrice(yearlyPrice, i18n.language),
                  })}
                </Button>
              </div>
              {yearlySavings != null && (
                <p className="text-xs text-foreground/70">
                  {t("yearlySavings", { percent: yearlySavings })}
                </p>
              )}
            </div>
          ) : (
            <Button
              onClick={() => startCheckout(DEFAULT_BILLING_INTERVAL)}
              disabled={isStartingCheckout}
            >
              {t("upgrade")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
