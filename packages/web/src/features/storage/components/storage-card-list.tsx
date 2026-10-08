import { DeleteDialog } from "@/components/delete-dialog";
import { FoilOverlay } from "@/components/foil-overlay";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRemoveCardFromLocation } from "@/features/storage/api/use-storage-locations";
import { usePriceSource } from "@/hooks/use-price-source";
import type { StorageCardListProps } from "@/lib/interfaces/storage";
import type { StorageLocationSearchResult } from "@magic-vault/shared";
import { IconBox, IconBoxOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardList({
  entries,
  onOpenLocation,
  onOpenCard,
}: StorageCardListProps) {
  const { t } = useTranslation("storage");
  const { priceOf, format } = usePriceSource();
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const [pendingRemoval, setPendingRemoval] =
    useState<StorageLocationSearchResult | null>(null);

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                {t("cards.columns.price")}
              </TableHead>
              <TableHead className="w-10">
                <span className="sr-only">{t("cards.columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const price = priceOf(entry.card, entry.isFoil);
              return (
                <TableRow
                  key={entry.scanId}
                  className="cursor-pointer"
                  onClick={() => onOpenCard(entry)}
                >
                  {onOpenLocation ? (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
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
                    <div className="relative aspect-[2.5/3.5] w-8 overflow-hidden rounded-md bg-muted">
                      {entry.card.image?.small && (
                        <img
                          src={entry.card.image.small}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}
                      {entry.isFoil && <FoilOverlay />}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-48 truncate font-medium">
                    <button
                      type="button"
                      className="max-w-full truncate rounded-sm text-left hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCard(entry);
                      }}
                    >
                      {entry.card.name}
                    </button>
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
                  <TableCell className="text-right text-xs tabular-nums">
                    {price != null ? format(price) : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon-sm"
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
      <DeleteDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={t("removeDialog.title", {
          name: pendingRemoval?.card.name ?? "",
          location: pendingRemoval?.locationName ?? "",
        })}
        description={t("removeDialog.description")}
        confirmLabel={t("removeDialog.confirm")}
        onConfirm={() => {
          const entry = pendingRemoval;
          setPendingRemoval(null);
          if (entry) void removeCard(entry.locationGuid, entry.scanId);
        }}
      />
    </>
  );
}
