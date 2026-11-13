import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState } from "react-native";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { subscribeToCardReviewWidgetPresses, syncCardReviewWidget } from "@/features/widgets/api/card-review-widget-sync";
import { updateHomeWidgets } from "@/features/widgets/api/update-home-widgets";
import { widgetSummaryQueryOptions } from "@/features/widgets/api/widget-summary";
import { buildScannerActivityTimeline } from "@/features/widgets/lib/scanner-activity-timeline";
import { cacheWidgetCardImages } from "@/features/widgets/lib/widget-card-images";
import { cacheWidgetLogo } from "@/features/widgets/lib/widget-logo";
import {
  buildCardOfTheDayWidgetProps,
  buildCardReviewWidgetProps,
  buildCollectionValueWidgetProps,
  buildTopCardsWidgetProps,
  buildTotalCardsWidgetProps,
  buildWidgetCollectionOptions,
  widgetSummaryImageUrls,
} from "@/features/widgets/lib/widget-summary-props";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import {
  EMPTY_CARD_LIST_WIDGET_PROPS,
  EMPTY_CARD_REVIEW_WIDGET_PROPS,
  EMPTY_COLLECTION_VALUE_WIDGET_PROPS,
  EMPTY_NOTIFICATIONS_WIDGET_PROPS,
  EMPTY_SCANNER_ACTIVITY_WIDGET_PROPS,
  EMPTY_TOTAL_CARDS_WIDGET_PROPS,
  EMPTY_WIDGET_LOGO,
  NOTIFICATIONS_WIDGET_URL,
  SCANNER_ACTIVITY_WIDGET_REFRESH_MS,
} from "@/lib/constants/widgets";
import type { WidgetSummaryPropsOptions } from "@/lib/interfaces/widgets";

export function useHomeWidgetSync(): void {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const orgId = useActiveOrgId();
  const pricing = usePricing();
  const { data: overview } = useQuery(orgOverviewQueryOptions(orgId, false));
  const { data: tradeOffers } = useQuery(pendingTradeOffersQueryOptions(orgId));
  const alerts = useAppAlerts();
  const { locks } = useAppStream();
  const { data: collections } = useQuery(collectionsQueryOptions(orgId));
  const isAnyScannerRunning = Object.keys(locks).length > 0;
  const { data: widgetSummary, dataUpdatedAt: widgetSummaryUpdatedAt } = useQuery(
    widgetSummaryQueryOptions(orgId, isAnyScannerRunning),
  );
  const [scannerRefreshTick, setScannerRefreshTick] = useState(0);
  const [cardReviewSyncTick, setCardReviewSyncTick] = useState(0);
  const [cardImageUris, setCardImageUris] = useState<Map<string, string>>(() => new Map());
  const [logo, setLogo] = useState(EMPTY_WIDGET_LOGO);

  useEffect(() => {
    let cancelled = false;
    void cacheWidgetLogo()
      .then((cachedLogo) => {
        if (!cancelled) setLogo(cachedLogo);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAnyScannerRunning) return;
    const timer = setInterval(() => setScannerRefreshTick((tick) => tick + 1), SCANNER_ACTIVITY_WIDGET_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isAnyScannerRunning]);

  useEffect(() => {
    const requestCardReviewSync = () => setCardReviewSyncTick((tick) => tick + 1);
    const unsubscribe = subscribeToCardReviewWidgetPresses(requestCardReviewSync);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") requestCardReviewSync();
    });
    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!widgetSummary) return;
    let cancelled = false;
    void cacheWidgetCardImages(widgetSummaryImageUrls({ summary: widgetSummary })).then((uris) => {
      if (!cancelled) setCardImageUris(uris);
    });
    return () => {
      cancelled = true;
    };
  }, [widgetSummary]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "signed-in") {
      void syncCardReviewWidget({
        queryClient,
        summaryUpdatedAt: 0,
        buildProps: () => ({
          ...EMPTY_CARD_REVIEW_WIDGET_PROPS,
          status: "signed-out",
          logo,
          title: t("widgets.review.title"),
          message: t("widgets.signedOut"),
        }),
      });
      return;
    }
    if (!widgetSummary) return;
    void syncCardReviewWidget({
      queryClient,
      summaryUpdatedAt: widgetSummaryUpdatedAt,
      buildProps: (pendingAcceptedScanIds) =>
        buildCardReviewWidgetProps({
          t,
          locale: i18n.language,
          formatPrice: pricing.format,
          summary: widgetSummary,
          cardImageUris,
          logo,
          pendingAcceptedScanIds,
          now: Date.now(),
        }),
    });
  }, [status, widgetSummary, widgetSummaryUpdatedAt, cardImageUris, logo, pricing, queryClient, t, i18n.language, cardReviewSyncTick]);

  useEffect(() => {
    if (status === "loading") return;
    const notificationsTitle = t("alerts.title");
    const scannerActivityTitle = t("widgets.scanner.title");

    if (status !== "signed-in") {
      const message = t("widgets.signedOut");
      updateHomeWidgets({
        collectionValue: {
          ...EMPTY_COLLECTION_VALUE_WIDGET_PROPS,
          status: "signed-out",
          logo,
          title: t("widgets.collectionValueTitle"),
          message,
        },
        totalCards: { ...EMPTY_TOTAL_CARDS_WIDGET_PROPS, status: "signed-out", logo, title: t("widgets.totalCards.title"), message },
        topCards: {
          ...EMPTY_CARD_LIST_WIDGET_PROPS,
          status: "signed-out",
          logo,
          title: t("widgets.topCards.title"),
          message,
        },
        cardOfTheDay: {
          ...EMPTY_CARD_LIST_WIDGET_PROPS,
          status: "signed-out",
          logo,
          title: t("widgets.cardOfTheDay.title"),
          message,
        },
        notifications: { ...EMPTY_NOTIFICATIONS_WIDGET_PROPS, status: "signed-out", title: notificationsTitle, message },
        scannerActivity: [
          {
            date: new Date(),
            props: { ...EMPTY_SCANNER_ACTIVITY_WIDGET_PROPS, status: "signed-out", title: scannerActivityTitle, message },
          },
        ],
        collectionOptions: { collectionValue: [], other: [] },
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
    const now = Date.now();
    const summaryPropsOptions: WidgetSummaryPropsOptions | null = widgetSummary
      ? {
          t,
          locale: i18n.language,
          formatPrice: pricing.format,
          summary: widgetSummary,
          cardImageUris,
          logo,
          pendingAcceptedScanIds: new Set(),
          now,
        }
      : null;

    updateHomeWidgets({
      collectionValue: summaryPropsOptions ? buildCollectionValueWidgetProps(summaryPropsOptions) : undefined,
      totalCards: summaryPropsOptions ? buildTotalCardsWidgetProps(summaryPropsOptions) : undefined,
      topCards: summaryPropsOptions ? buildTopCardsWidgetProps(summaryPropsOptions) : undefined,
      cardOfTheDay: summaryPropsOptions ? buildCardOfTheDayWidgetProps(summaryPropsOptions) : undefined,
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
      scannerActivity: buildScannerActivityTimeline({
        t,
        locale: i18n.language,
        title: scannerActivityTitle,
        locks,
        collectionNames: new Map((collections ?? []).map((collection) => [collection.guid, collection.name])),
        overview,
        scanActivity: widgetSummary?.scanActivity ?? [],
        latestDeviceAlert: widgetSummary?.latestDeviceAlert ?? null,
        now,
      }),
      collectionOptions: summaryPropsOptions ? buildWidgetCollectionOptions(summaryPropsOptions) : { collectionValue: [], other: [] },
    });
  }, [
    status,
    overview,
    tradeOffers,
    alerts,
    locks,
    collections,
    widgetSummary,
    cardImageUris,
    logo,
    pricing,
    t,
    i18n.language,
    scannerRefreshTick,
  ]);
}
