import { MobileTabStrip } from "@/components/mobile-tab-strip";
import {
  MOBILE_HERO_LABEL_CLASS,
  MOBILE_HERO_VALUE_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileCardDetailDrawer } from "@/features/scanner/components/mobile-card-detail-drawer";
import { MobileMonitorActivity } from "@/features/scanner/components/mobile-monitor-activity";
import { MobileMonitorCards } from "@/features/scanner/components/mobile-monitor-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";
import type {
  MobileMonitorTab,
  MobileMonitorTabItem,
  MobileSessionMonitorProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toReviewGridCard } from "@magic-vault/shared";
import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { MONITOR_NEEDS_REVIEW_CARDS_QUERY } from "@/lib/constants/scanner";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

export function MobileSessionMonitor({
  session,
  cards,
  collectionGuid,
  header,
  toolbarLeading,
  binCount,
  canEditCards,
  backHref,
}: MobileSessionMonitorProps) {
  const { t } = useTranslation("scanner");
  const { format } = usePriceSource();
  const { t: tCards } = useTranslation("cards");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MobileMonitorTab>("cards");
  const [reviewing, setReviewing] = useState(false);
  const [reviewingGrid, setReviewingGrid] = useState(false);
  const [reviewLayout, setReviewLayout] = useReviewLayout();
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const heroCollapsed = useScrollCollapse(scrollRoot);
  const { collection, status, unmatchedCount, errors } = session;
  const { stats, cardCount, openScanId, setOpenScanId } = cards;
  const alertCount = unmatchedCount + errors.length;
  const hasPricing = !!stats?.hasPricing;

  const handleOpenCard = useCallback(
    (scanId: string) => setOpenScanId(scanId),
    [setOpenScanId],
  );
  const handleCloseCard = useCallback(() => {
    setReviewing(false);
    setOpenScanId(null);
  }, [setOpenScanId]);

  const reviewGridPage = useQuery({
    ...collectionCardsPageQueryOptions(
      collectionGuid,
      MONITOR_NEEDS_REVIEW_CARDS_QUERY,
      0,
    ),
    enabled: reviewingGrid,
    placeholderData: undefined,
  });
  const reviewGridCards = useMemo(
    () =>
      (reviewGridPage.data?.items ?? []).map((entry) =>
        toReviewGridCard(collectionGuid, entry),
      ),
    [collectionGuid, reviewGridPage.data],
  );

  const openReviewGrid = useCallback(() => {
    setReviewLayout("grid");
    setReviewing(false);
    setOpenScanId(null);
    setReviewingGrid(true);
  }, [setReviewLayout, setOpenScanId]);

  const startOneByOneReview = useCallback(async () => {
    try {
      const page = await queryClient.fetchQuery(
        collectionCardsPageQueryOptions(
          collectionGuid,
          MONITOR_NEEDS_REVIEW_CARDS_QUERY,
          0,
        ),
      );
      const first = page.items[0];
      if (!first) {
        toast.info(tCards("review.nothingLeft"));
        return;
      }
      setReviewing(true);
      setOpenScanId(first.scanId);
    } catch {
      toast.error(tCards("review.startFailed"));
    }
  }, [collectionGuid, queryClient, setOpenScanId, tCards]);

  const startReview = useCallback(() => {
    if (reviewLayout === "grid") openReviewGrid();
    else void startOneByOneReview();
  }, [reviewLayout, openReviewGrid, startOneByOneReview]);

  const tabs: MobileMonitorTabItem[] = [
    { key: "cards", label: t("mobileMonitor.tabCards") },
    {
      key: "activity",
      label: t("mobileMonitor.tabActivity"),
      badge: alertCount,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MobilePageHeader
        title={collection ? collection.name : <Skeleton className="h-7 w-40" />}
        subtitle={[
          t(`mobileMonitor.status.${status}`),
          collection?.game?.name,
          heroCollapsed &&
            (hasPricing && stats
              ? format(stats.totalValue)
              : `${cardCount} ${t("mobileMonitor.cards")}`),
        ]
          .filter(Boolean)
          .join(" · ")}
        subtitleLeading={
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              status === "connected" &&
                "bg-success animate-pulse motion-reduce:animate-none",
              status === "connecting" && "bg-warning",
              (status === "error" || status === "closed") && "bg-destructive",
            )}
          />
        }
        backTo={backHref}
        collapsed={heroCollapsed}
        actions={
          (header || toolbarLeading) && (
            <>
              {header}
              {toolbarLeading}
            </>
          )
        }
      >
        <div className="flex flex-col gap-0.5">
          <p className={MOBILE_HERO_LABEL_CLASS}>
            {hasPricing
              ? t("sessionStatsPanel.value")
              : t("mobileMonitor.cards")}
          </p>
          <p className={MOBILE_HERO_VALUE_CLASS}>
            {stats?.hasPricing ? format(stats.totalValue) : String(cardCount)}
          </p>
          <p className="text-sm text-foreground/70 tabular-nums">
            {[
              hasPricing && `${cardCount} ${t("mobileMonitor.cards")}`,
              stats && `${stats.uniqueCount} ${t("unique")}`,
            ]
              .filter(Boolean)
              .join(" · ") || " "}
          </p>
        </div>
      </MobilePageHeader>

      {reviewingGrid && canEditCards ? (
        <div
          data-scroll-root
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <ReviewGrid
            cards={reviewGridCards}
            total={reviewGridPage.data?.totalCards ?? 0}
            isLoading={reviewGridPage.isPending}
            isError={reviewGridPage.isError}
            onOpenOneByOne={(card) => {
              setReviewLayout("single");
              setReviewingGrid(false);
              setReviewing(true);
              setOpenScanId(card.scanId);
            }}
            onClose={() => setReviewingGrid(false)}
          />
        </div>
      ) : (
        <>
          <MobileTabStrip items={tabs} value={tab} onChange={setTab} />

          <div
            ref={setScrollRoot}
            data-scroll-root
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            )}
          >
            {tab === "cards" ? (
              <MobileMonitorCards
                cards={cards}
                status={status}
                binCount={binCount}
                canEditCards={canEditCards}
                onStartReview={startReview}
              />
            ) : (
              <MobileMonitorActivity
                session={session}
                collectionGuid={collectionGuid}
                stats={stats}
                canEditCards={canEditCards}
                onOpenCard={handleOpenCard}
              />
            )}
          </div>
        </>
      )}

      <MobileCardDetailDrawer
        collectionGuid={collectionGuid}
        collection={collection}
        canEditCards={canEditCards}
        scanId={openScanId}
        reviewMode={reviewing}
        onShowReviewGrid={openReviewGrid}
        onNavigate={(next) => {
          if (next) setOpenScanId(next);
          else handleCloseCard();
        }}
        onReviewComplete={(count) => {
          handleCloseCard();
          toast.success(tCards("review.complete", { count }));
        }}
        onClose={handleCloseCard}
      />
    </div>
  );
}
