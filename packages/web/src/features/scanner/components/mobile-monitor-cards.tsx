import {
  type GroupedScannedCard,
  EMPTY_CARD_FILTERS,
} from "@magic-vault/shared";
import { useState } from "react";
import { MobileCardActionsDrawer } from "@/features/scanner/components/mobile-card-actions-drawer";
import { EmptyState } from "@/components/empty-state";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import { CardSortButton } from "@/features/cards/components/card-sort-button";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import { MobileCardTile } from "@/features/scanner/components/mobile-card-tile";
import type { MobileMonitorCardsProps } from "@/lib/interfaces/scanner";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconHelpCircle,
  IconSearch,
  IconStack2,
  IconWifiOff,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileMonitorCards({
  cards,
  status,
  binCount,
  canEditCards,
}: MobileMonitorCardsProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
    groupDuplicates,
    setGroupDuplicates,
    entries,
    isLoading,
    page,
    pageCount,
    setPage,
    stats,
    cardCount,
    matchingCount,
    needsReviewCount,
    setOpenScanId,
  } = cards;

  const showReviewChip =
    canEditCards && (needsReviewCount > 0 || filters.needsAttention);

  const goToPage = (next: number, target: HTMLElement) => {
    setPage(next);
    target.closest("[data-scroll-root]")?.scrollTo({ top: 0 });
  };

  const [actionsEntry, setActionsEntry] = useState<GroupedScannedCard | null>(
    null,
  );

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
            <Input
              type="search"
              placeholder={t("mobileMonitor.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ClearCardQueryButton
            searchQuery={searchQuery}
            activeFilterCount={activeFilterCount}
            onClear={() => {
              setSearchQuery("");
              setFilters(EMPTY_CARD_FILTERS);
            }}
          />
          <CardSortButton
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortableFields={sortableFields}
          />
          <CardFilterPopover
            activeFilters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
            availableRarities={stats?.rarities ?? []}
            availableColors={stats?.colors ?? []}
            availableFoilTypes={stats?.foilTypes ?? []}
            binCount={binCount}
          />
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3">
          {showReviewChip && (
            <Button
              size="sm"
              variant={filters.needsAttention ? "default" : "outline"}
              className="shrink-0 rounded-full"
              onClick={() =>
                setFilters({
                  ...filters,
                  needsAttention: !filters.needsAttention,
                })
              }
            >
              <IconHelpCircle className="size-4" />
              {t("mobileMonitor.needsReview")}
              <span className="tabular-nums opacity-80">
                {needsReviewCount}
              </span>
            </Button>
          )}
          <Button
            size="sm"
            variant={groupDuplicates ? "default" : "outline"}
            className="shrink-0 rounded-full"
            onClick={() => setGroupDuplicates(!groupDuplicates)}
          >
            <IconStack2 className="size-4" />
            {t("mobileMonitor.groupDuplicates")}
          </Button>
        </div>
      </div>

      {status === "error" && (
        <Callout variant="error" icon={IconWifiOff} className="mx-3 mt-3">
          {t("monitorPage.connectFailed")}
        </Callout>
      )}

      {isLoading && entries.length === 0 ? (
        <div className="grid grid-cols-3 gap-2 p-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : cardCount === 0 ? (
        <EmptyState
          icon={IconCards}
          title={t("monitorPage.noCardsScannedYet")}
        />
      ) : matchingCount === 0 ? (
        <EmptyState
          icon={IconSearch}
          title={t("monitorPage.noCardsMatchSearch")}
        />
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-3 p-3">
          {entries.map((entry) => (
            <MobileCardTile
              key={entry.scanId}
              entry={entry}
              onOpen={
                canEditCards ? () => setOpenScanId(entry.scanId) : undefined
              }
              onLongPress={
                canEditCards ? () => setActionsEntry(entry) : undefined
              }
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => goToPage(Math.max(0, page - 1), e.currentTarget)}
            disabled={page === 0}
            aria-label={t("mobileMonitor.previousPage")}
          >
            <IconChevronLeft />
          </Button>
          <span className="text-sm text-foreground/70 tabular-nums">
            {tCards("cardGrid.pageOf", { page: page + 1, total: pageCount })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) =>
              goToPage(Math.min(pageCount - 1, page + 1), e.currentTarget)
            }
            disabled={page === pageCount - 1}
            aria-label={t("mobileMonitor.nextPage")}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
      {canEditCards && (
        <MobileCardActionsDrawer
          entry={actionsEntry}
          onOpenDetails={setOpenScanId}
          onClose={() => setActionsEntry(null)}
        />
      )}
    </>
  );
}
