import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { ListPagination } from "@/components/list-pagination";
import { ScannedCardGridSkeleton } from "@/features/cards/components/scanned-card-grid-skeleton";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardTable } from "@/features/cards/components/scanned-card-table";
import { MONITOR_CARD_GRID_CLASS } from "@/lib/constants/scanner";
import type { MonitorCardGridProps } from "@/lib/interfaces/scanner";
import {
  IconCards,
  IconSearch,
  IconWifiOff,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MonitorCardGrid({
  entries,
  status,
  cardCount,
  matchingCount,
  isLoading,
  viewMode,
  groupDuplicates,
  page,
  pageSize,
  preferredPageSize,
  onPageSizeChange,
  pageCount,
  onPageChange,
  showBinLocation,
  onOpenCard,
}: MonitorCardGridProps) {
  const { t } = useTranslation("scanner");

  return (
    <>
      <ListPagination
        alignsEnd
        className="px-4 pt-4"
        pagination={{
          page: page + 1,
          pageCount,
          setPage: (nextPage) => onPageChange(nextPage - 1),
          from: page * pageSize + 1,
          to: page * pageSize + entries.length,
          total: matchingCount,
        }}
        pageSize={preferredPageSize}
        onPageSizeChange={onPageSizeChange}
      />
      {isLoading &&
        entries.length === 0 &&
        (viewMode === "list" ? (
          <div className="p-4 md:px-3 md:py-2">
            <div className="overflow-hidden rounded-card bg-card px-2 py-1">
              <ListSkeleton rows={10} leading="thumbnail" hasSubtitle hasTrailing />
            </div>
          </div>
        ) : (
          <ScannedCardGridSkeleton className={MONITOR_CARD_GRID_CLASS} />
        ))}
      {status === "error" && (
        <div
          role="alert"
          className="flex items-center justify-center h-32 text-destructive text-sm gap-2"
        >
          <IconWifiOff aria-hidden className="size-4" />
          {t("monitorPage.connectFailed")}
        </div>
      )}
      {!isLoading && cardCount === 0 && (
        <EmptyState icon={IconCards} title={t("monitorPage.noCardsScannedYet")} />
      )}
      {!isLoading && cardCount > 0 && matchingCount === 0 && (
        <EmptyState icon={IconSearch} title={t("monitorPage.noCardsMatchSearch")} />
      )}
      {entries.length === 0 ? null : viewMode === "list" ? (
        <div className="p-4 md:px-3 md:py-2">
          <div className="overflow-hidden rounded-card bg-card">
            <ScannedCardTable
              rows={entries.map((entry) => ({
                scanId: entry.scanId,
                scanIds: entry.scanIds,
                card: entry.card,
                binNumber: entry.binNumber,
                quantity: entry.quantity,
                isFoil: entry.isFoil,
                foilType: entry.foilType,
                condition: entry.condition,
                hasAlternatives: !!entry.alternativeMatches?.length,
                lowConfidenceMatch: entry.lowConfidenceMatch,
                wasCorrected: entry.corrected,
                isReviewed: entry.reviewed,
                storageLocation: entry.storageLocation,
              }))}
              showQuantity={groupDuplicates}
              showBinLocation={showBinLocation}
              onOpen={onOpenCard ? (row) => onOpenCard(row.scanId) : undefined}
            />
          </div>
        </div>
      ) : (
        <div className={MONITOR_CARD_GRID_CLASS}>
          {entries.map((entry) => (
            <ScannedCardItem
              key={entry.scanId}
              card={entry.card}
              binNumber={entry.binNumber}
              onOpen={() => onOpenCard?.(entry.scanId)}
              hasAlternatives={!!entry.alternativeMatches?.length}
              lowConfidenceMatch={entry.lowConfidenceMatch}
              wasCorrected={entry.corrected}
              isReviewed={entry.reviewed}
              storageLocation={entry.storageLocation}
              isFoil={entry.isFoil}
              foilType={entry.foilType}
              condition={entry.condition}
              quantity={entry.quantity}
              showBinLocation={showBinLocation}
            />
          ))}
        </div>
      )}
      <ListPagination
        alignsEnd
        className="px-4 pb-4"
        pagination={{
          page: page + 1,
          pageCount,
          setPage: (nextPage) => onPageChange(nextPage - 1),
          from: page * pageSize + 1,
          to: page * pageSize + entries.length,
          total: matchingCount,
        }}
        pageSize={preferredPageSize}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
