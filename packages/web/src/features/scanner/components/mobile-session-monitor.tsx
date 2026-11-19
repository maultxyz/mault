import {
  MOBILE_HERO_LABEL_CLASS,
  MOBILE_HERO_VALUE_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileCardDetailDrawer } from "@/features/scanner/components/mobile-card-detail-drawer";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { UnmatchedCardsGridDialog } from "@/features/scanner/components/unmatched-cards-grid-dialog";
import {
  clearUnmatchedScans,
  removeUnmatchedScan,
} from "@/features/collections/api/collections";
import { MobileMonitorCards } from "@/features/scanner/components/mobile-monitor-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";
import type { MobileSessionMonitorProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCompactNumber, toReviewGridCard } from "@magic-vault/shared";
import { CompactCount, CompactPrice } from "@/components/compact-value";
import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { CARD_REVIEW_GRID_PARAM_VALUE } from "@/lib/constants/cards";
import {
  MONITOR_NEEDS_REVIEW_CARDS_QUERY,
  MONITOR_OPEN_CARD_PARAM,
  MONITOR_REVIEW_ONE_BY_ONE_PARAM_VALUE,
  MONITOR_REVIEW_PARAM,
} from "@/lib/constants/scanner";
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
  const { t, i18n } = useTranslation("scanner");
  const { formatCompact } = usePriceSource();
  const { t: tCards } = useTranslation("cards");
  const queryClient = useQueryClient();
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);
  const [unmatchedOpenIndex, setUnmatchedOpenIndex] = useState<number | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewParam = searchParams.get(MONITOR_REVIEW_PARAM);
  const reviewingGrid = reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const reviewing = reviewParam !== null && !reviewingGrid;
  const [reviewLayout, setReviewLayout] = useReviewLayout();
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const heroCollapsed = useScrollCollapse(scrollRoot);
  const { collection, status, unmatchedCount, errors } = session;
  const { stats, cardCount, openScanId, setOpenScanId } = cards;
  const hasPricing = !!stats?.hasPricing;

  const showCardAndReview = useCallback(
    (scanId: string | null, review: string | null) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (scanId) next.set(MONITOR_OPEN_CARD_PARAM, scanId);
          else next.delete(MONITOR_OPEN_CARD_PARAM);
          if (review) next.set(MONITOR_REVIEW_PARAM, review);
          else next.delete(MONITOR_REVIEW_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleCloseCard = useCallback(
    () => showCardAndReview(null, null),
    [showCardAndReview],
  );

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
    showCardAndReview(null, CARD_REVIEW_GRID_PARAM_VALUE);
  }, [setReviewLayout, showCardAndReview]);

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
        showCardAndReview(null, null);
        toast.info(tCards("review.nothingLeft"));
        return;
      }
      showCardAndReview(first.scanId, MONITOR_REVIEW_ONE_BY_ONE_PARAM_VALUE);
    } catch {
      showCardAndReview(null, null);
      toast.error(tCards("review.startFailed"));
    }
  }, [collectionGuid, queryClient, showCardAndReview, tCards]);

  const startReview = useCallback(() => {
    if (reviewLayout === "grid") openReviewGrid();
    else void startOneByOneReview();
  }, [reviewLayout, openReviewGrid, startOneByOneReview]);

  const reviewAwaitsFirstCard = reviewing && !openScanId;
  const startOneByOneReviewRef = useRef(startOneByOneReview);
  startOneByOneReviewRef.current = startOneByOneReview;
  useEffect(() => {
    if (reviewAwaitsFirstCard) void startOneByOneReviewRef.current();
  }, [reviewAwaitsFirstCard]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MobilePageHeader
        title={collection ? collection.name : <Skeleton className="h-7 w-40" />}
        subtitle={[
          t(`mobileMonitor.status.${status}`),
          collection?.game?.name,
          heroCollapsed &&
            (hasPricing && stats
              ? formatCompact(stats.totalValue)
              : `${formatCompactNumber(cardCount, i18n.language)} ${t("mobileMonitor.cards")}`),
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
            {stats?.hasPricing ? (
              <CompactPrice value={stats.totalValue} />
            ) : (
              <CompactCount value={cardCount} />
            )}
          </p>
          <p className="text-sm text-foreground/70 tabular-nums">
            {[
              hasPricing &&
                `${formatCompactNumber(cardCount, i18n.language)} ${t("mobileMonitor.cards")}`,
              stats &&
                `${formatCompactNumber(stats.uniqueCount, i18n.language)} ${t("unique")}`,
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
              showCardAndReview(
                card.scanId,
                MONITOR_REVIEW_ONE_BY_ONE_PARAM_VALUE,
              );
            }}
            onClose={handleCloseCard}
          />
        </div>
      ) : (
        <div
          ref={setScrollRoot}
          data-scroll-root
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          {errors.length > 0 && (
            <div className="px-4 pt-4">
              <SessionErrorsPanel errors={errors} />
            </div>
          )}
          <MobileMonitorCards
            cards={cards}
            status={status}
            binCount={binCount}
            canEditCards={canEditCards}
            onStartReview={startReview}
            unmatchedCount={unmatchedCount}
            onOpenUnmatched={() => {
              setUnmatchedOpenIndex(null);
              setUnmatchedOpen(true);
            }}
          />
        </div>
      )}

      <UnmatchedCardsGridDialog
        open={unmatchedOpen}
        onOpenChange={setUnmatchedOpen}
        openIndex={unmatchedOpenIndex}
        onOpenIndexChange={setUnmatchedOpenIndex}
        collectionGuid={collectionGuid}
        canIdentify={canEditCards}
        onRemove={
          canEditCards
            ? (scanId) => removeUnmatchedScan(collectionGuid, scanId)
            : undefined
        }
        onRemoveAll={
          canEditCards ? () => clearUnmatchedScans(collectionGuid) : undefined
        }
      />

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
