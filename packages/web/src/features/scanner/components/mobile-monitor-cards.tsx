import {
  type GroupedScannedCard,
  EMPTY_CARD_FILTERS,
} from "@magic-vault/shared";
import { useRef, useState } from "react";
import { MobileCardActionsDrawer } from "@/features/scanner/components/mobile-card-actions-drawer";
import { EmptyState } from "@/components/empty-state";
import { Callout } from "@/components/callout";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { MobileSearchInput } from "@/components/mobile-search-input";
import {
  MOBILE_FILTER_CHIP_ACTIVE_CLASS,
  MOBILE_FILTER_CHIP_CLASS,
  MOBILE_FILTER_CHIP_IDLE_CLASS,
  MOBILE_ICON_BUTTON_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CardViewOptionsDrawer } from "@/features/cards/components/card-view-options-drawer";
import { ClearCardQueryButton } from "@/features/cards/components/clear-card-query-button";
import { MobileCardTile } from "@/features/scanner/components/mobile-card-tile";
import type { MobileMonitorCardsProps } from "@/lib/interfaces/scanner";
import {
  IconCards,
  IconHelpCircle,
  IconListCheck,
  IconSearch,
  IconWifiOff,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileMonitorCards({
  cards,
  status,
  binCount,
  canEditCards,
  onStartReview,
}: MobileMonitorCardsProps) {
  const { t } = useTranslation("scanner");
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

  const paginationRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    paginationRef.current
      ?.closest("[data-scroll-root]")
      ?.scrollTo({ top: 0 });
  };

  const [actionsEntry, setActionsEntry] = useState<GroupedScannedCard | null>(
    null,
  );

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background/85 px-4 pt-4 pb-3 backdrop-blur-xl">
        <div className="flex gap-1.5">
          <MobileSearchInput
            placeholder={t("mobileMonitor.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {(!!searchQuery.trim() || activeFilterCount > 0) && (
            <ClearCardQueryButton
              searchQuery={searchQuery}
              activeFilterCount={activeFilterCount}
              className={MOBILE_ICON_BUTTON_CLASS}
              onClear={() => {
                setSearchQuery("");
                setFilters(EMPTY_CARD_FILTERS);
              }}
            />
          )}
          <CardViewOptionsDrawer
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortableFields={sortableFields}
            activeFilters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
            availableRarities={stats?.rarities ?? []}
            availableColors={stats?.colors ?? []}
            availableFoilTypes={stats?.foilTypes ?? []}
            binCount={binCount}
            groupDuplicates={groupDuplicates}
            onGroupDuplicatesChange={setGroupDuplicates}
            triggerClassName={MOBILE_ICON_BUTTON_CLASS}
          />
        </div>
        {showReviewChip && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
            {canEditCards && needsReviewCount > 0 && onStartReview && (
              <Button
                className={MOBILE_FILTER_CHIP_CLASS}
                onClick={onStartReview}
              >
                <IconListCheck />
                {t("mobileMonitor.review", { count: needsReviewCount })}
              </Button>
            )}
            <Button
              variant="ghost"
              className={cn(
                MOBILE_FILTER_CHIP_CLASS,
                filters.needsAttention
                  ? MOBILE_FILTER_CHIP_ACTIVE_CLASS
                  : MOBILE_FILTER_CHIP_IDLE_CLASS,
              )}
              onClick={() =>
                setFilters({
                  ...filters,
                  needsAttention: !filters.needsAttention,
                })
              }
            >
              <IconHelpCircle />
              {t("mobileMonitor.needsReview")}
              <span className="tabular-nums opacity-80">
                {needsReviewCount}
              </span>
            </Button>
          </div>
        )}
      </div>

      {status === "error" && (
        <Callout variant="error" icon={IconWifiOff} className="mx-4 mt-4">
          {t("monitorPage.connectFailed")}
        </Callout>
      )}

      {isLoading && entries.length === 0 ? (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-4 pt-2 pb-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
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
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-4 pt-2 pb-4">
          {entries.map((entry) => (
            <MobileCardTile
              key={entry.scanId}
              entry={entry}
              onOpen={() => setOpenScanId(entry.scanId)}
              onLongPress={
                canEditCards ? () => setActionsEntry(entry) : undefined
              }
            />
          ))}
        </div>
      )}

      <div ref={paginationRef}>
        <ListPagination
          className="px-4 pb-8"
          pagination={{
            page: page + 1,
            pageCount,
            setPage: (nextPage) => goToPage(nextPage - 1),
          }}
        />
      </div>
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
