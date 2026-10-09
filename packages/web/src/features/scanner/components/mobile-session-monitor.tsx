import { MobileTabStrip } from "@/components/mobile-tab-strip";
import {
  MOBILE_HEADER_BUTTON_CLASS,
  MOBILE_HEADER_BODY_CLASS,
  MOBILE_HEADER_CLASS,
  MOBILE_HEADER_FADE_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileCardDetailDrawer } from "@/features/scanner/components/mobile-card-detail-drawer";
import { MobileMonitorActivity } from "@/features/scanner/components/mobile-monitor-activity";
import { MobileMonitorCards } from "@/features/scanner/components/mobile-monitor-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import type {
  MobileMonitorTab,
  MobileMonitorTabItem,
  MobileSessionMonitorProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconChevronLeft } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  const [tab, setTab] = useState<MobileMonitorTab>("cards");
  const { collection, status, unmatchedCards, errors } = session;
  const { stats, cardCount, openScanId, setOpenScanId } = cards;
  const alertCount = unmatchedCards.length + errors.length;
  const hasPricing = !!stats?.hasPricing;

  const handleOpenCard = useCallback(
    (scanId: string) => setOpenScanId(scanId),
    [setOpenScanId],
  );
  const handleCloseCard = useCallback(
    () => setOpenScanId(null),
    [setOpenScanId],
  );

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
      <header className={MOBILE_HEADER_CLASS}>
        <div className={MOBILE_HEADER_BODY_CLASS}>
          <div className="flex min-h-9 items-center gap-1">
            {backHref && (
              <Button
                variant="ghost"
                size="icon-lg"
                className={MOBILE_HEADER_BUTTON_CLASS}
                aria-label={t("mobileMonitor.back")}
                render={<Link to={backHref} />}
              >
                <IconChevronLeft />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              {collection ? (
                <h1 className="truncate font-heading text-lg leading-tight font-semibold">
                  {collection.name}
                </h1>
              ) : (
                <Skeleton className="h-5 w-40 bg-primary-foreground/20" />
              )}
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full ring-1 ring-primary-foreground/40",
                    status === "connected" &&
                      "bg-success animate-pulse motion-reduce:animate-none",
                    status === "connecting" && "bg-warning",
                    (status === "error" || status === "closed") &&
                      "bg-destructive",
                  )}
                />
                <span className="truncate">
                  {[t(`mobileMonitor.status.${status}`), collection?.game?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {header}
              {toolbarLeading}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xs font-medium uppercase tracking-wide text-primary-foreground/80">
                {hasPricing
                  ? t("sessionStatsPanel.value")
                  : t("mobileMonitor.cards")}
              </p>
              <p className="truncate font-heading text-2xl leading-tight font-semibold tabular-nums">
                {stats?.hasPricing
                  ? format(stats.totalValue)
                  : String(cardCount)}
              </p>
            </div>
            <p className="shrink-0 pb-0.5 text-xs text-primary-foreground/80 tabular-nums">
              {[
                hasPricing && `${cardCount} ${t("mobileMonitor.cards")}`,
                stats && `${stats.uniqueCount} ${t("unique")}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div aria-hidden className={MOBILE_HEADER_FADE_CLASS} />
      </header>

      <MobileTabStrip items={tabs} value={tab} onChange={setTab} />

      <div
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
          />
        ) : (
          <MobileMonitorActivity
            session={session}
            stats={stats}
            canEditCards={canEditCards}
            onOpenCard={canEditCards ? handleOpenCard : undefined}
          />
        )}
      </div>

      {canEditCards && (
        <MobileCardDetailDrawer
          collectionGuid={collectionGuid}
          scanId={openScanId}
          onClose={handleCloseCard}
        />
      )}
    </div>
  );
}
