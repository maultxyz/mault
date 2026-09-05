import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useBilling } from "../api/use-billing";

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

  const isBusiness = billing.plan === "business";
  const usagePercent =
    billing.dailyLimit != null
      ? Math.min(100, Math.round((billing.cardsScannedToday / billing.dailyLimit) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Badge variant={isBusiness ? "success" : "secondary"}>
          {t(isBusiness ? "plan.business" : "plan.free")}
        </Badge>
      </div>

      {!isBusiness && billing.dailyLimit != null && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
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
        <p className="text-sm text-muted-foreground">
          {t("cancelAtPeriodEnd", {
            date: new Date(billing.currentPeriodEnd).toLocaleDateString(),
          })}
        </p>
      )}

      {canManage && (
        <div>
          {isBusiness ? (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={isOpeningPortal}>
              {t("manage")}
            </Button>
          ) : (
            <Button size="sm" onClick={startCheckout} disabled={isStartingCheckout}>
              {t("upgrade")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
