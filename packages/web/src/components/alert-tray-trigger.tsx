import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { usePendingTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { tradeOfferPath } from "@/lib/constants/trade-offers";
import { Link } from "react-router-dom";
import { IconArrowsExchange, IconRefresh } from "@tabler/icons-react";
import { useAlertTrayRefresh } from "@/hooks/alerts/use-alert-tray-refresh";
import { useAppAlertsContext } from "@/hooks/alerts/use-app-alerts";
import type {
  AlertTrayItemProps,
  AlertTrayTriggerProps,
} from "@/lib/interfaces/alerts";
import { ALERT_SEVERITY_ICON_CLASS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";
import {
  TRADE_OFFER_TRAY_MESSAGE_KEYS,
  tradeOfferMessageValues,
  tradeOfferOfferKind,
} from "@magic-vault/shared";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

function TrayItem({ alert }: AlertTrayItemProps) {
  const { t } = useTranslation("common");
  const Icon = alert.icon;

  return (
    <div className="flex items-start gap-2 rounded-md p-2 hover:bg-foreground/6">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          ALERT_SEVERITY_ICON_CLASS[alert.severity],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-foreground">
          <span className="sr-only">{t(`a11y.severity.${alert.severity}`)} </span>
          {alert.link ? (
            <a
              href={alert.link}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              {alert.message}
            </a>
          ) : (
            alert.message
          )}
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
}: AlertTrayTriggerProps) {
  const { t } = useTranslation("common");
  const tradeOffersHeadingId = useId();
  const { trayAlerts } = useAppAlertsContext();
  const tradeOffers = usePendingTradeOffers();
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const { refresh, isRefreshing } = useAlertTrayRefresh();
  const [refreshStatus, setRefreshStatus] = useState("");
  const refreshTray = async () => {
    setRefreshStatus("");
    const succeeded = await refresh();
    setRefreshStatus(succeeded ? t("alerts.tray.refreshed") : t("alerts.tray.refreshFailed"));
  };

  return (
    <DynamicPopover
      open={isTrayOpen}
      onOpenChange={setIsTrayOpen}
      side={side}
      align={align}
      contentClassName="w-80"
      trigger={trigger(trayAlerts.length + tradeOffers.length)}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{t("alerts.tray.title")}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-foreground/70">v{__APP_VERSION__}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("alerts.tray.refresh")}
            title={t("alerts.tray.refresh")}
            disabled={isRefreshing}
            onClick={() => void refreshTray()}
          >
            <IconRefresh
              aria-hidden
              className={cn(isRefreshing && "animate-spin motion-reduce:animate-none")}
            />
          </Button>
        </div>
      </div>
      <span role="status" className="sr-only">
        {refreshStatus}
      </span>
      {tradeOffers.length > 0 && (
        <section aria-labelledby={tradeOffersHeadingId} className="flex flex-col gap-0.5">
          <h3
            id={tradeOffersHeadingId}
            className="px-1 pt-1 text-xs font-medium tracking-wide text-foreground/70 uppercase"
          >
            {t("tradeOffers.trayHeading")}
          </h3>
          {tradeOffers.map((offer) => (
            <div key={offer.guid} className="flex items-start gap-2 rounded-md p-2 hover:bg-foreground/6">
              <IconArrowsExchange
                className={cn("mt-0.5 size-3.5 shrink-0", ALERT_SEVERITY_ICON_CLASS.info)}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-foreground">
                  {t(TRADE_OFFER_TRAY_MESSAGE_KEYS[tradeOfferOfferKind(offer)], {
                    name: offer.guestName,
                    ...tradeOfferMessageValues(offer),
                  })}
                </span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link to={tradeOfferPath(offer.guid)} />}
                    onClick={() => setIsTrayOpen(false)}
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
  );
}
