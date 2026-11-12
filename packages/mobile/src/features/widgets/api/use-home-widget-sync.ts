import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { updateHomeWidgets } from "@/features/widgets/api/update-home-widgets";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import {
  COLLECTION_VALUE_WIDGET_URL,
  EMPTY_COLLECTION_VALUE_WIDGET_PROPS,
  EMPTY_NOTIFICATIONS_WIDGET_PROPS,
  NOTIFICATIONS_WIDGET_URL,
} from "@/lib/constants/widgets";

export function useHomeWidgetSync(): void {
  const { t } = useTranslation();
  const { status } = useSession();
  const orgId = useActiveOrgId();
  const pricing = usePricing();
  const { data: overview } = useQuery(orgOverviewQueryOptions(orgId, false));
  const { data: tradeOffers } = useQuery(pendingTradeOffersQueryOptions(orgId));
  const alerts = useAppAlerts();

  useEffect(() => {
    if (status === "loading") return;
    const collectionValueTitle = t("widgets.collectionValueTitle");
    const notificationsTitle = t("alerts.title");

    if (status !== "signed-in") {
      const message = t("widgets.signedOut");
      updateHomeWidgets({
        collectionValue: { ...EMPTY_COLLECTION_VALUE_WIDGET_PROPS, status: "signed-out", title: collectionValueTitle, message },
        notifications: { ...EMPTY_NOTIFICATIONS_WIDGET_PROPS, status: "signed-out", title: notificationsTitle, message },
      });
      return;
    }
    if (!overview || !tradeOffers) return;

    const notificationCount = tradeOffers.length + alerts.length;
    const summaryParts = [
      tradeOffers.length > 0 ? t("widgets.tradeOffersCount", { count: tradeOffers.length }) : null,
      alerts.length > 0 ? t("widgets.alertsCount", { count: alerts.length }) : null,
    ].filter((part): part is string => part !== null);
    const latestTradeOffer = tradeOffers[0];
    const latestMessage = latestTradeOffer
      ? t("tradeOffers.trayMessage", {
          name: latestTradeOffer.guestName,
          wanted: latestTradeOffer.wanted.length,
          offered: latestTradeOffer.offered.reduce((sum, card) => sum + card.quantity, 0),
        })
      : (alerts[0]?.message ?? "");

    updateHomeWidgets({
      collectionValue: {
        status: "ready",
        url: COLLECTION_VALUE_WIDGET_URL,
        title: collectionValueTitle,
        message: "",
        totalValue: pricing.format(overview.totalValue),
        cardCount: t("collection.cardsCount", { count: overview.cardCount }),
        scansToday: t("widgets.scansToday", { count: overview.scansToday }),
        scansThisWeek: t("widgets.scansThisWeek", { count: overview.scansThisWeek }),
      },
      notifications: {
        status: "ready",
        url: NOTIFICATIONS_WIDGET_URL,
        title: notificationsTitle,
        message: "",
        count: notificationCount,
        countLabel: t("widgets.notificationsCount", { count: notificationCount }),
        summary: summaryParts.length > 0 ? summaryParts.join(" · ") : t("alerts.empty"),
        latestMessage,
      },
    });
  }, [status, overview, tradeOffers, alerts, pricing, t]);
}
