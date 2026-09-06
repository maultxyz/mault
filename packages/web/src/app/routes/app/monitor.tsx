import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { RecentScannedCards } from "@/features/scanner/components/recent-scanned-cards";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { computeDisplayStats } from "@/features/scanner/lib/compute-stats";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconWifiOff,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const PAGE_SIZE = 96;

function CardGrid({
  filteredAndSorted,
  status,
  cardCount,
  isMobile,
}: {
  filteredAndSorted: ReturnType<typeof useCardFilterSort>["filteredAndSorted"];
  status: string;
  cardCount: number;
  isMobile: boolean;
}) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const [page, setPage] = useState(0);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / PAGE_SIZE),
  );
  const clampedPage = Math.min(page, pageCount - 1);
  const pagedCards = filteredAndSorted.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [filteredAndSorted.length]);

  return (
    <>
      {status === "connecting" && cardCount === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm gap-2">
          <IconLoader2 size={16} className="animate-spin" />
          {t("monitorPage.loadingSession")}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center justify-center h-32 text-destructive text-sm gap-2">
          <IconWifiOff size={16} />
          {t("monitorPage.connectFailed")}
        </div>
      )}
      {status === "connected" && cardCount === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {t("monitorPage.noCardsScannedYet")}
        </div>
      )}
      {status === "connected" &&
        cardCount > 0 &&
        filteredAndSorted.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {t("monitorPage.noCardsMatchSearch")}
          </div>
        )}
      <div
        className={cn(
          "grid gap-2 p-4",
          isMobile
            ? "grid-cols-2"
            : "grid-cols-3 @md:grid-cols-4 @4xl:grid-cols-6 @5xl:grid-cols-8",
        )}
      >
        {pagedCards.map((card) => (
          <ScannedCardItem
            key={card.scanId}
            card={card.card}
            binNumber={card.binNumber}
            onOpen={() => {}}
          />
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
          >
            <IconChevronLeft />
          </Button>
          <span className="text-sm text-muted-foreground">
            {tCards("cardGrid.pageOf", {
              page: clampedPage + 1,
              total: pageCount,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={clampedPage === pageCount - 1}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}

export default function MonitorPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { collection, cards, viewers, errors, status } =
    useSessionMonitor(collectionGuid);
  const { locks, currentUserId } = useCollectionLocks();
  const isMobile = useIsMobile();

  const isScanning = !!(collectionGuid && locks[collectionGuid]);
  const scannerUserId = collectionGuid
    ? locks[collectionGuid]?.userId
    : undefined;
  const otherViewers = viewers.filter(
    (v) => v.userId !== scannerUserId && v.userId !== currentUserId,
  );
  const fieldDefinitions = collection?.game?.fieldDefinitions ?? [];
  const {
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
  } = useCardFilterSort(cards, fieldDefinitions);
  const stats = useMemo(
    () => computeDisplayStats(cards, filteredAndSorted),
    [cards, filteredAndSorted],
  );

  const viewerAvatars = (
    <>
      {isScanning && collectionGuid && locks[collectionGuid] && (
        <InitialsAvatar
          name={locks[collectionGuid].displayName}
          variant="scanner"
          tooltip={t("monitorPage.isScanningTooltip", {
            name: locks[collectionGuid].displayName,
          })}
        />
      )}
      {otherViewers.map((v) => (
        <InitialsAvatar
          key={v.userId}
          name={v.displayName}
          variant="neutral"
          tooltip={t("monitorPage.isWatchingTooltip", { name: v.displayName })}
        />
      ))}
    </>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {(isScanning || otherViewers.length > 0) && (
          <div className="flex items-center gap-1">{viewerAvatars}</div>
        )}

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <SessionStatsPanel stats={stats} totalCards={filteredAndSorted.length} />
          <RecentScannedCards cards={cards} />
          <SessionErrorsPanel errors={errors} />
        </div>

        <Drawer>
          <DrawerTrigger className="flex items-center justify-center gap-2 mx-3 mb-3 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
            <IconCards className="size-4" />
            {cards.length > 0
              ? t("monitorPage.viewCards", { count: cards.length })
              : t("monitorPage.viewCardsEmpty")}
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">
              {t("monitorPage.scannedCardsTitle")}
            </DrawerTitle>
            <div className="flex flex-col overflow-hidden flex-1 min-h-0 pt-2">
              <div className="px-2 pb-2 border-b @container">
                <CardToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortKey={sortKey}
                  onSortChange={setSortKey}
                  sortableFields={sortableFields}
                  hasCards={filteredAndSorted.length > 0}
                  activeFilters={filters}
                  onFiltersChange={setFilters}
                  activeFilterCount={activeFilterCount}
                  availableRarities={stats?.rarities}
                  availableColors={stats?.colors}
                  cardCount={cards.length}
                />
              </div>
              <div className="overflow-y-auto flex-1 @container">
                <CardGrid
                  filteredAndSorted={filteredAndSorted}
                  status={status}
                  cardCount={cards.length}
                  isMobile
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <aside className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar/70">
        {(isScanning || otherViewers.length > 0) && (
          <div className="flex items-center gap-1 px-1 flex-wrap">
            {viewerAvatars}
          </div>
        )}
        <SessionStatsPanel stats={stats} totalCards={filteredAndSorted.length} />
        <SessionErrorsPanel errors={errors} />
      </aside>

      <main className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 overflow-y-auto h-full @container">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-2 border-b">
          <CardToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortableFields={sortableFields}
            hasCards={filteredAndSorted.length > 0}
            activeFilters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
            availableRarities={stats?.rarities}
            availableColors={stats?.colors}
            cardCount={cards.length}
          />
        </div>
        <CardGrid
          filteredAndSorted={filteredAndSorted}
          status={status}
          cardCount={cards.length}
          isMobile={false}
        />
      </main>
    </div>
  );
}
