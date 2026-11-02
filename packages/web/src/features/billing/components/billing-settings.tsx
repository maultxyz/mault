import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_BILLING_INTERVAL,
  DEFAULT_PAID_PLAN,
  PAID_PLAN_KEYS,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useBilling } from "../api/use-billing";
import { billingPlanNameKey } from "../lib/billing-plan-name";
import { BillingPlanTable } from "./billing-plan-table";
import { PlanUpgradeOption } from "./plan-upgrade-option";

export function BillingSettings() {
  const { t } = useTranslation("billing");
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

  const isPaid = billing.plan !== "free";
  const upgradeOptions = PAID_PLAN_KEYS.flatMap((plan) => {
    const prices = billing.planPrices?.[plan];
    return prices && (prices.month || prices.year) ? [{ plan, prices }] : [];
  });

  return (
    <SettingsSection heading={t(`plan.${billingPlanNameKey(billing)}`)}>
      {billing.isLegacyPlan && (
        <Callout variant="info">{t("legacyPlanNote")}</Callout>
      )}

      <BillingPlanTable billing={billing} />

      {isPaid && billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
        <p className="text-xs text-foreground/70">
          {t("cancelAtPeriodEnd", {
            date: new Date(billing.currentPeriodEnd).toLocaleDateString(),
          })}
        </p>
      )}

      {isPaid && billing.interval && !billing.cancelAtPeriodEnd && (
        <p className="text-xs text-foreground/70">
          {t(billing.interval === "year" ? "billedYearly" : "billedMonthly")}
        </p>
      )}

      {canManage && isPaid && (
        <div className="flex flex-col gap-1.5">
          <div>
            <Button
              variant="outline"
              onClick={openPortal}
              disabled={isOpeningPortal}
            >
              {t("manage")}
            </Button>
          </div>
          <p className="text-xs text-foreground/70">
            {t("changePlanInPortal")}
          </p>
        </div>
      )}

      {canManage && !isPaid && upgradeOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          {upgradeOptions.map(({ plan, prices }) => (
            <PlanUpgradeOption
              key={plan}
              plan={plan}
              prices={prices}
              isStartingCheckout={isStartingCheckout}
              onCheckout={startCheckout}
            />
          ))}
        </div>
      )}

      {canManage && !isPaid && upgradeOptions.length === 0 && (
        <div>
          <Button
            onClick={() =>
              startCheckout({
                plan: DEFAULT_PAID_PLAN,
                interval: DEFAULT_BILLING_INTERVAL,
              })
            }
            disabled={isStartingCheckout}
          >
            {t("upgradeTo", { plan: t(`plan.${DEFAULT_PAID_PLAN}`) })}
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
