import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { usePendingTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { TradeOfferReviewDialog } from "@/features/trade-offers/components/trade-offer-review-dialog";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useAppAlertsContext } from "@/hooks/alerts/use-app-alerts";
import type { AppAlert } from "@/lib/interfaces/alerts";
import { ALERT_SEVERITY_ICON_CLASS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

function TrayItem({ alert }: { alert: AppAlert }) {
  const { t } = useTranslation("common");
  const Icon = alert.icon;

  return (
    <div className="flex items-start gap-2 rounded-md p-2 hover:bg-muted">
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          ALERT_SEVERITY_ICON_CLASS[alert.severity],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-foreground">
          <span className="sr-only">{t(`a11y.severity.${alert.severity}`)} </span>
          {alert.message}
        </span>
        {alert.actions && (
          <div className="flex flex-wrap gap-1">{alert.actions}</div>
        )}
      </div>
    </div>
  );
}

export function AlertTrayTrigger({
  trigger,
  side = "right",
  align = "start",
}: {
  trigger: (count: number) => ReactElement;
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
}) {
  const { t } = useTranslation("common");
  const { trayAlerts } = useAppAlertsContext();
  const tradeOffers = usePendingTradeOffers();
  const [reviewedOfferGuid, setReviewedOfferGuid] = useState<string | null>(null);
  const reviewedOffer = tradeOffers.find((offer) => offer.guid === reviewedOfferGuid) ?? null;

  return (
    <>
    <DynamicPopover
      side={side}
      align={align}
      contentClassName="w-80"
      trigger={trigger(trayAlerts.length + tradeOffers.length)}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{t("alerts.tray.title")}</span>
        <span className="text-foreground/70">v{__APP_VERSION__}</span>
      </div>
      {tradeOffers.length > 0 && (
        <section aria-labelledby="trade-offers-tray-heading" className="flex flex-col gap-0.5">
          <h3
            id="trade-offers-tray-heading"
            className="px-1 pt-1 text-xs font-medium tracking-wide text-foreground/70 uppercase"
          >
            {t("tradeOffers.trayHeading")}
          </h3>
          {tradeOffers.map((offer) => (
            <div key={offer.guid} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted">
              <IconArrowsExchange
                className={cn("mt-0.5 size-3.5 shrink-0", ALERT_SEVERITY_ICON_CLASS.info)}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-foreground">
                  {t("tradeOffers.trayMessage", {
                    name: offer.guestName,
                    wanted: offer.wanted.length,
                    offered: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
                  })}
                </span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    onClick={() => setReviewedOfferGuid(offer.guid)}
                  >
                    {t("tradeOffers.review")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
      {trayAlerts.length === 0 && tradeOffers.length === 0 ? (
        <p className="px-1 py-4 text-center text-foreground/70">
          {t("alerts.tray.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {trayAlerts.map((alert) => (
            <TrayItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </DynamicPopover>
    <TradeOfferReviewDialog
      offer={reviewedOffer}
      onOpenChange={(open) => {
        if (!open) setReviewedOfferGuid(null);
      }}
    />
    </>
  );
}
