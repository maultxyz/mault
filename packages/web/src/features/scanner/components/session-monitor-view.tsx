import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { useMonitorCards } from "@/features/scanner/api/use-monitor-cards";
import { MobileSessionMonitor } from "@/features/scanner/components/mobile-session-monitor";
import { MonitorCardDetail } from "@/features/scanner/components/monitor-card-detail";
import { MonitorCardGrid } from "@/features/scanner/components/monitor-card-grid";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { SessionMonitorViewProps } from "@/lib/interfaces/scanner";
import { useCallback } from "react";

export function SessionMonitorView({
  session,
  cardsSource,
  header,
  toolbarLeading,
  binCount,
  showBinLocation,
  canEditCards = false,
  backHref,
}: SessionMonitorViewProps) {
  const { unmatchedCards, errors, status } = session;
  const isMobile = useIsMobile();
  const cards = useMonitorCards(session, cardsSource, canEditCards);
  const { stats, cardCount, matchingCount, openScanId, setOpenScanId } = cards;

  const handleOpenCard = useCallback(
    (scanId: string) => setOpenScanId(scanId),
    [setOpenScanId],
  );
  const handleCloseCard = useCallback(
    () => setOpenScanId(null),
    [setOpenScanId],
  );

  if (isMobile) {
    return (
      <MobileSessionMonitor
        session={session}
        cards={cards}
        collectionGuid={cardsSource.collectionGuid}
        header={header}
        toolbarLeading={toolbarLeading}
        binCount={binCount}
        canEditCards={canEditCards}
        backHref={backHref}
      />
    );
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <aside className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar/70">
        {header}
        <SessionStatsPanel stats={stats} totalCards={cards.filteredCount} />
        <UnmatchedCardsPanel cards={unmatchedCards} />
        <SessionErrorsPanel errors={errors} />
      </aside>

      <main className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 overflow-y-auto h-full @container">
        {openScanId ? (
          <MonitorCardDetail
            collectionGuid={cardsSource.collectionGuid}
            scanId={openScanId}
            cardsQuery={cards.cardsQuery}
            onNavigate={setOpenScanId}
            onClose={handleCloseCard}
          />
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-2 border-b">
              <CardToolbar
                leading={toolbarLeading}
                searchQuery={cards.searchQuery}
                onSearchChange={cards.setSearchQuery}
                sortKey={cards.sortKey}
                onSortChange={cards.setSortKey}
                sortableFields={cards.sortableFields}
                hasCards={matchingCount > 0}
                activeFilters={cards.filters}
                onFiltersChange={cards.setFilters}
                activeFilterCount={cards.activeFilterCount}
                availableRarities={stats?.rarities}
                availableColors={stats?.colors}
                binCount={binCount}
                cardCount={cardCount}
                viewMode={cards.viewMode}
                onViewModeChange={cards.setViewMode}
                groupDuplicates={cards.groupDuplicates}
                onGroupDuplicatesChange={cards.setGroupDuplicates}
              />
            </div>
            <MonitorCardGrid
              entries={cards.entries}
              status={status}
              cardCount={cardCount}
              matchingCount={matchingCount}
              isLoading={cards.isLoading}
              viewMode={cards.viewMode}
              groupDuplicates={cards.groupDuplicates}
              page={cards.page}
              pageCount={cards.pageCount}
              onPageChange={cards.setPage}
              showBinLocation={showBinLocation}
              onOpenCard={canEditCards ? handleOpenCard : undefined}
            />
          </>
        )}
      </main>
    </div>
  );
}
