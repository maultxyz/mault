import { CardThumbnail } from "@/components/card-thumbnail";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusIcon } from "@/features/cards/components/review-status-icon";
import { useRemoveCardFromLocation } from "@/features/storage/api/use-storage-locations";
import { MobileStorageCardList } from "@/features/storage/components/mobile-storage-card-list";
import { RemoveFromLocationDialog } from "@/features/storage/components/remove-from-location-dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useShiftClick } from "@/hooks/use-shift-click";
import { usePriceSource } from "@/hooks/use-price-source";
import type { StorageCardListProps } from "@/lib/interfaces/storage";
import {
  formatPriceInCurrency,
  type StorageLocationSearchResult,
} from "@magic-vault/shared";
import { IconBox, IconBoxOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";

export function StorageCardList({
  entries,
  onOpenLocation,
  onOpenCard,
  isSelected,
  onToggleSelect,
  onTogglePageSelect,
}: StorageCardListProps) {
  const { t } = useTranslation("storage");
  const { t: tCards } = useTranslation("cards");
  const { priceOf, priceAtScanOf, format } = usePriceSource();
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const [pendingRemoval, setPendingRemoval] =
    useState<StorageLocationSearchResult | null>(null);
  const isMobile = useIsMobile();
  const { onMouseDown: onSelectMouseDown, consumeShift } = useShiftClick();
  const selectedOnPageCount = isSelected
    ? entries.filter((entry) => isSelected(entry)).length
    : 0;
  const isPageSelected =
    entries.length > 0 && selectedOnPageCount === entries.length;

  if (isMobile) {
    return (
      <MobileStorageCardList
        entries={entries}
        onOpenLocation={onOpenLocation}
        onOpenCard={onOpenCard}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-card bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {onToggleSelect && (
                <TableHead className="w-8">
                  {onTogglePageSelect && (
                    <Checkbox
                      aria-label={tCards("scannedCardTable.selectPage")}
                      checked={isPageSelected}
                      indeterminate={selectedOnPageCount > 0 && !isPageSelected}
                      onCheckedChange={onTogglePageSelect}
                    />
                  )}
                </TableHead>
              )}
              {onOpenLocation ? (
                <TableHead>{t("cards.columns.location")}</TableHead>
              ) : (
                <TableHead className="w-12 text-right">
                  {t("cards.columns.position")}
                </TableHead>
              )}
              <TableHead className="w-10">
                <span className="sr-only">{t("cards.columns.image")}</span>
              </TableHead>
              <TableHead>{t("cards.columns.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("cards.columns.set")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("cards.columns.number")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("cards.columns.finish")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("cards.columns.collection")}
              </TableHead>
              <TableHead className="text-right">
                {t("cards.columns.priceAtScan")}
              </TableHead>
              <TableHead className="text-right">
                {t("cards.columns.priceNow")}
              </TableHead>
              <TableHead className="text-right">
                {t("cards.columns.purchasePrice")}
              </TableHead>
              <TableHead className="w-10">
                <span className="sr-only">{t("cards.columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const finish = { isFoil: entry.isFoil, foilType: entry.foilType };
              const price = priceOf(entry.card, finish, entry.condition);
              const priceAtScan = priceAtScanOf(
                entry.card,
                finish,
                entry.condition,
              );
              return (
                <TableRow
                  key={entry.scanId}
                  data-state={isSelected?.(entry) ? "selected" : undefined}
                  className="cursor-pointer"
                  {...modifierClickSelectHandlers(
                    onToggleSelect &&
                      ((shiftKey) => onToggleSelect(entry, { shiftKey })),
                  )}
                  onClick={() => onOpenCard(entry)}
                >
                  {onToggleSelect && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={onSelectMouseDown}
                    >
                      <Checkbox
                        aria-label={tCards("scannedCardTable.selectRow", {
                          name: entry.card.name,
                        })}
                        checked={!!isSelected?.(entry)}
                        onCheckedChange={() =>
                          onToggleSelect(entry, { shiftKey: consumeShift() })
                        }
                      />
                    </TableCell>
                  )}
                  {onOpenLocation ? (
                    <TableCell>
                      <Button
                        variant="outline"
                        className="max-w-40"
                        title={t("search.openLocation")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLocation(entry.locationGuid);
                        }}
                      >
                        <IconBox />
                        <span className="truncate">
                          {t("cardLocation.value", {
                            name: entry.locationName,
                            position: entry.position,
                          })}
                        </span>
                      </Button>
                    </TableCell>
                  ) : (
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground/70">
                      {t("cards.position", { position: entry.position })}
                    </TableCell>
                  )}
                  <TableCell>
                    <CardThumbnail image={entry.card.image} />
                  </TableCell>
                  <TableCell className="max-w-48 font-medium">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="min-w-0 truncate rounded-sm text-left hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCard(entry);
                        }}
                      >
                        {entry.card.name}
                      </button>
                      <ReviewStatusIcon
                        hasAlternatives={entry.hasAlternatives}
                        lowConfidenceMatch={entry.lowConfidenceMatch}
                        wasCorrected={entry.corrected}
                        isReviewed={entry.reviewed}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-40 truncate text-xs text-foreground/70 sm:table-cell">
                    {`${entry.card.setName} (${entry.card.set.toUpperCase()})`}
                  </TableCell>
                  <TableCell className="hidden text-xs tabular-nums text-foreground/70 sm:table-cell">
                    {entry.card.collectorNumber}
                  </TableCell>
                  <TableCell className="hidden text-xs text-foreground/70 md:table-cell">
                    {entry.isFoil
                      ? (entry.foilType ?? t("cards.foil"))
                      : t("cards.nonFoil")}
                  </TableCell>
                  <TableCell className="hidden max-w-36 truncate text-xs text-foreground/70 lg:table-cell">
                    {entry.collectionName}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-foreground/70">
                    {priceAtScan != null ? format(priceAtScan) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {price != null ? format(price) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-foreground/70">
                    {entry.acquisitionCost != null && entry.acquisitionCurrency
                      ? formatPriceInCurrency(
                          entry.acquisitionCost,
                          entry.acquisitionCurrency,
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={t("cards.remove")}
                      title={t("cards.remove")}
                      disabled={isRemoving}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingRemoval(entry);
                      }}
                    >
                      <IconBoxOff />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <RemoveFromLocationDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        cardName={pendingRemoval?.card.name ?? ""}
        locationName={pendingRemoval?.locationName ?? ""}
        collectionName={pendingRemoval?.collectionName ?? ""}
        onConfirm={(alsoRemoveFromCollection) => {
          const entry = pendingRemoval;
          setPendingRemoval(null);
          if (!entry) return;
          void removeCard({
            locationGuid: entry.locationGuid,
            scanId: entry.scanId,
            collectionGuid: entry.collectionGuid,
            alsoRemoveFromCollection,
          });
        }}
      />
    </>
  );
}
