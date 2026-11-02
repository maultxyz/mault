import { EmptyState } from "@/components/empty-state";
import { CardTileSkeletonGrid } from "@/components/card-tile-skeleton-grid";
import { ListPagination } from "@/components/list-pagination";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardTable } from "@/features/cards/components/scanned-card-table";
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
  pageCount,
  onPageChange,
  showBinLocation,
  onOpenCard,
}: MonitorCardGridProps) {
  const { t } = useTranslation("scanner");

  return (
    <>
      {isLoading && entries.length === 0 && (
        <CardTileSkeletonGrid count={12} />
      )}
      {status === "error" && (
        <div className="flex items-center justify-center h-32 text-destructive text-sm gap-2">
          <IconWifiOff size={16} />
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
        <div className="p-4">
          <div className="rounded-lg border">
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
        <div className="grid gap-2 p-4 grid-cols-3 @md:grid-cols-4 @4xl:grid-cols-6 @5xl:grid-cols-8">
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
        className="px-4 pb-4"
        pagination={{
          page: page + 1,
          pageCount,
          setPage: (nextPage) => onPageChange(nextPage - 1),
        }}
      />
    </>
  );
}
