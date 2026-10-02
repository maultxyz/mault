import { EmptyState } from "@/components/empty-state";
import { CardTileSkeletonGrid } from "@/components/card-tile-skeleton-grid";
import { Button } from "@/components/ui/button";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardTable } from "@/features/cards/components/scanned-card-table";
import type { MonitorCardGridProps } from "@/lib/interfaces/scanner";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
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
  const { t: tCards } = useTranslation("cards");

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
                hasAlternatives: !!entry.alternativeMatches?.length,
                needsReview: entry.needsReview,
                wasCorrected: entry.corrected,
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
              needsReview={entry.needsReview}
              wasCorrected={entry.corrected}
              isFoil={entry.isFoil}
              foilType={entry.foilType}
              quantity={entry.quantity}
              showBinLocation={showBinLocation}
            />
          ))}
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            <IconChevronLeft />
          </Button>
          <span className="text-sm text-foreground/70">
            {tCards("cardGrid.pageOf", { page: page + 1, total: pageCount })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            disabled={page === pageCount - 1}
          >
            <IconChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}
