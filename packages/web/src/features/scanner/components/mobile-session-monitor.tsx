import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileCardDetailDrawer } from "@/features/scanner/components/mobile-card-detail-drawer";
import { MobileMonitorActivity } from "@/features/scanner/components/mobile-monitor-activity";
import { MobileMonitorCards } from "@/features/scanner/components/mobile-monitor-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import type {
  MobileMonitorTab,
  MobileMonitorTabItem,
  MobileSessionMonitorProps,
  MobileStatTileProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconChevronLeft } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function MobileStatTile({ label, value }: MobileStatTileProps) {
  return (
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2">
      <p className="truncate text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="truncate text-base font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

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
      <header className="flex shrink-0 flex-col gap-2 border-b bg-sidebar px-2 pt-2 pb-2">
        <div className="flex items-center gap-1">
          {backHref && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={t("mobileMonitor.back")}
              render={<Link to={backHref} />}
            >
              <IconChevronLeft />
            </Button>
          )}
          <div className={cn("min-w-0 flex-1", !backHref && "pl-1")}>
            {collection ? (
              <h1 className="truncate text-base font-semibold text-foreground">
                {collection.name}
              </h1>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
            <div className="flex items-center gap-1.5 text-xs text-foreground/70">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  status === "connected" && "bg-green-500 animate-pulse",
                  status === "connecting" && "bg-amber-500",
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
          <div className="flex shrink-0 items-center gap-1">
            {header}
            {toolbarLeading}
          </div>
        </div>
        <ButtonGroup role="tablist" className="w-full">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <Button
                key={item.key}
                role="tab"
                aria-selected={active}
                variant={active ? "outline-selected" : "outline"}
                className="h-8 flex-1 text-sm"
                onClick={() => setTab(item.key)}
              >
                {item.label}
                {!!item.badge && (
                  <Badge variant="secondary" className="tabular-nums">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </ButtonGroup>
      </header>

      <div
        data-scroll-root
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="grid grid-cols-3 gap-2 px-3 pt-3">
          <MobileStatTile
            label={t("mobileMonitor.cards")}
            value={String(cardCount)}
          />
          <MobileStatTile
            label={t("unique")}
            value={stats ? String(stats.uniqueCount) : "-"}
          />
          <MobileStatTile
            label={t("sessionStatsPanel.value")}
            value={stats?.hasPricing ? format(stats.totalValue) : "-"}
          />
        </div>

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
