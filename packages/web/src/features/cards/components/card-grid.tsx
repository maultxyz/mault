import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { useCardFilters } from "@/features/cards/api/use-card-filters";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { SessionSummaryDialog } from "@/features/cards/components/session-summary-dialog";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useSessionViewersByGuid } from "@/features/collections/api/use-live-counts";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScannerIsland } from "@/features/scanner/api/use-scanner-island";
import { ScannerControls } from "@/features/scanner/components/scanner-controls";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
import { computeStats } from "@/features/scanner/lib/compute-stats";

import {
  IconAlbum,
  IconArrowBarToDown,
  IconBolt,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";
import { CARD_PAGE_SIZE as PAGE_SIZE } from "@/lib/constants/limits";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function CardGrid() {
  const { t } = useTranslation("cards");
  const { activeCollection, isLoading: collectionsLoading } = useCollections();
  const {
    cards,
    removeCard,
    removeCards,
    clearCards,
    markDownloaded,
    isLoading,
    elapsedMs,
    autoFeed,
    setAutoFeed,
    forceFoilType,
    setForceFoilType,
  } = useScannedCards();
  const foilOptions = activeCollection?.game?.foilTypes?.length
    ? activeCollection.game.foilTypes
    : [t("cardGrid.foilGeneric")];
  const [summaryOpen, setSummaryOpen] = useState(false);
  const scanner = useScannerIsland();
  const { locks, currentUserId } = useCollectionLocks();
  const isScanningActive = !!(
    activeCollection && locks[activeCollection.guid]?.userId === currentUserId
  );
  const viewersByGuid = useSessionViewersByGuid();
  const viewers =
    isScanningActive && activeCollection
      ? viewersByGuid[activeCollection.guid]?.filter(
          (v) => v.userId !== currentUserId,
        )
      : undefined;
  const { filters, setFilters } = useCardFilters();
  const { fieldDefinitions } = useBinConfigs();
  const {
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    activeFilterCount,
  } = useCardFilterSort(cards, fieldDefinitions, { filters, setFilters });
  const stats = useMemo(() => computeStats(cards), [cards]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openScanId, setOpenScanId] = useState<string | null>(null);
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
  }, [searchQuery, filters, sortKey, activeCollection?.guid]);

  const openIndex = openScanId
    ? filteredAndSorted.findIndex((c) => c.scanId === openScanId)
    : -1;
  const openEntry = openIndex >= 0 ? filteredAndSorted[openIndex] : null;

  const toggleSelect = useCallback((scanId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      return next;
    });
  }, []);

  const allSelected =
    filteredAndSorted.length > 0 &&
    filteredAndSorted.every((card) => selectedIds.has(card.scanId));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allCurrentlySelected =
        filteredAndSorted.length > 0 &&
        filteredAndSorted.every((card) => prev.has(card.scanId));
      return allCurrentlySelected
        ? new Set()
        : new Set(filteredAndSorted.map((card) => card.scanId));
    });
  }, [filteredAndSorted]);

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeCards, selectedIds]);

  const handleClearSession = useCallback(async () => {
    clearCards();
  }, [clearCards]);

  if (isLoading) {
    return (
      <>
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-b">
          <div className="flex flex-row gap-2 items-center w-full">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-full sm:w-64 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
          </div>
        </div>
        <div className="p-2 flex-1">
          <div className="grid grid-cols-3 @md:grid-cols-4 @4xl:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-lg p-1 bg-muted border">
                <Skeleton className="aspect-[2.5/3.5] rounded-lg" />
                <div className="flex flex-row justify-between items-center px-1 pb-1">
                  <div className="flex flex-row items-center gap-2">
                    <Skeleton className="size-3 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-3 w-6 rounded" />
                  </div>
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!collectionsLoading && !activeCollection) {
    return (
      <EmptyState
        icon={<IconAlbum className="size-10" />}
        title={t("cardGrid.noCollectionSelected")}
        description={t("cardGrid.createOrSelectCollection")}
        action={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link to="/app/collections">
                {t("cardGrid.manageCollections")}
              </Link>
            }
          ></Button>
        }
      />
    );
  }

  if (cards.length === 0) {
    return (
      <>
        <NoGameBanner />
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsScanned")}
          description={t("cardGrid.scanToGetStarted")}
        />
        {scanner?.isCameraActive && (
          <div className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-t">
            <div className="flex flex-row gap-2 items-center w-full">
              <ScannerControls
                status={scanner.status}
                onForceAddDuplicate={scanner.handleForceAddDuplicate}
                onForceScan={scanner.handleForceScan}
                onSkipDuplicate={scanner.handleSkipDuplicate}
                onPause={scanner.handlePause}
                onResume={scanner.handleResume}
              />
              <Select
                value={forceFoilType ?? "none"}
                onValueChange={(value) =>
                  setForceFoilType(value === "none" ? null : value)
                }
              >
                <SelectTrigger size="sm" className="gap-1">
                  <IconSparkles className="size-3.5" />
                  <SelectValue placeholder={t("cardGrid.foilNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("cardGrid.foilNone")}</SelectItem>
                  {foilOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scanner.isConnected && (
                <>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          onClick={scanner.handleFeed}
                          disabled={!scanner.isReady || scanner.isFeeding}
                        >
                          {scanner.isFeeding
                            ? t("cardGrid.feeding")
                            : t("cardGrid.start")}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {t("cardGrid.startTooltip")}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant={autoFeed ? "default" : "outline"}
                          size="icon"
                          onClick={() => setAutoFeed(!autoFeed)}
                        >
                          <IconBolt />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {autoFeed
                        ? t("cardGrid.autoFeedOnTooltip")
                        : t("cardGrid.autoFeedOffTooltip")}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={scanner.handleClearDevice}
                          disabled={
                            !scanner.isReady || scanner.isClearingDevice
                          }
                        >
                          <IconArrowBarToDown />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {t("cardGrid.clearDeviceTooltip")}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <ScannerDebug />
            </div>
          </div>
        )}
      </>
    );
  }

  if (openEntry) {
    return (
      <CardDetailPanel
        scanId={openEntry.scanId}
        currentCard={openEntry.card}
        alternativeMatches={openEntry.alternativeMatches}
        isFoil={openEntry.isFoil}
        foilType={openEntry.foilType}
        binNumber={openEntry.binNumber}
        onClose={() => setOpenScanId(null)}
        onRemove={() => {
          removeCard(openEntry.scanId);
          setOpenScanId(null);
        }}
        onPrev={() =>
          setOpenScanId(filteredAndSorted[openIndex - 1]?.scanId ?? null)
        }
        onNext={() =>
          setOpenScanId(filteredAndSorted[openIndex + 1]?.scanId ?? null)
        }
        hasPrev={openIndex > 0}
        hasNext={openIndex < filteredAndSorted.length - 1}
        currentIndex={openIndex}
        total={filteredAndSorted.length}
      />
    );
  }

  return (
    <>
      <NoGameBanner />
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-b">
        <CardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          sortableFields={sortableFields}
          onExport={() => setSummaryOpen(true)}
          collectionName={activeCollection?.name}
          onClearAll={handleClearSession}
          hasCards={filteredAndSorted.length > 0}
          activeFilters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          watchers={viewers}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          availableRarities={stats?.rarities}
          availableColors={stats?.colors}
          cardCount={cards.length}
        />
      </div>
      {filteredAndSorted.length === 0 && (
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsMatchFilters")}
          description={t("cardGrid.tryAdjusting")}
        />
      )}
      <div className="p-2 flex-1">
        <div className="grid grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-6 @7xl:grid-cols-8 gap-2">
          {pagedCards.map((card) => (
            <ScannedCardItem
              key={card.scanId}
              card={card.card}
              onOpen={() => setOpenScanId(card.scanId)}
              binNumber={card.binNumber}
              isSelected={selectedIds.has(card.scanId)}
              onToggleSelect={() => toggleSelect(card.scanId)}
              hasAlternatives={!!card.alternativeMatches?.length}
              isFoil={card.isFoil}
              foilType={card.foilType}
              isDownloaded={card.isDownloaded}
            />
          ))}
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
            >
              <IconChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("cardGrid.pageOf", {
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
      </div>

      {(scanner?.isCameraActive || selectedIds.size > 0) && (
        <div className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-t">
          <div className="flex flex-row gap-2 items-center justify-between w-full">
            {scanner?.isCameraActive && (
              <div className="flex flex-row gap-2 items-center">
                <ScannerControls
                  status={scanner.status}
                  onForceAddDuplicate={scanner.handleForceAddDuplicate}
                  onForceScan={scanner.handleForceScan}
                  onSkipDuplicate={scanner.handleSkipDuplicate}
                  onPause={scanner.handlePause}
                  onResume={scanner.handleResume}
                />
                <Select
                  value={forceFoilType ?? "none"}
                  onValueChange={(value) =>
                    setForceFoilType(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger size="sm" className="gap-1">
                    <IconSparkles className="size-3.5" />
                    <SelectValue placeholder={t("cardGrid.foilNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("cardGrid.foilNone")}</SelectItem>
                    {foilOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scanner.isConnected && (
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            onClick={scanner.handleFeed}
                            disabled={!scanner.isReady || scanner.isFeeding}
                          >
                            {scanner.isFeeding
                              ? t("cardGrid.feeding")
                              : t("cardGrid.feed")}
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {t("cardGrid.feedTooltip")}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant={autoFeed ? "default" : "outline"}
                            size="icon"
                            onClick={() => setAutoFeed(!autoFeed)}
                          >
                            <IconBolt />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {autoFeed
                          ? t("cardGrid.autoFeedOnTooltip")
                          : t("cardGrid.autoFeedOffTooltip")}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={scanner.handleClearDevice}
                            disabled={
                              !scanner.isReady || scanner.isClearingDevice
                            }
                          >
                            <IconArrowBarToDown />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {t("cardGrid.clearDeviceTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                <ScannerDebug />
              </div>
            )}
            {selectedIds.size > 0 && (
              <div className="flex flex-row gap-2 items-center">
                <span className="text-sm text-muted-foreground">
                  {t("cardGrid.cardsSelected", { count: selectedIds.size })}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t("cardGrid.clear")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  {t("cardGrid.delete")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <SessionSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        cards={cards}
        elapsedMs={elapsedMs}
        collectionName={activeCollection?.name ?? "collection"}
        onMarkDownloaded={markDownloaded}
        gridFilters={filters}
        gridFilterCount={activeFilterCount}
      />

      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("cardGrid.deleteCardsTitle", { count: selectedIds.size })}
        description={t("cardGrid.deleteCardsDescription", {
          count: selectedIds.size,
        })}
        confirm={
          selectedIds.size > 100 ? { type: "keyword" } : { type: "simple" }
        }
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
