import { DeleteDialog } from "@/components/delete-dialog";
import { FoilOverlay } from "@/components/foil-overlay";
import { Button } from "@/components/ui/button";
import { useRemoveCardFromLocation } from "@/features/storage/api/use-storage-locations";
import type { StorageCardListProps } from "@/lib/interfaces/storage";
import type { StorageLocationSearchResult } from "@magic-vault/shared";
import { IconBox, IconBoxOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardList({
  entries,
  onOpenLocation,
}: StorageCardListProps) {
  const { t } = useTranslation("storage");
  const { removeCard, isRemoving } = useRemoveCardFromLocation();
  const [pendingRemoval, setPendingRemoval] =
    useState<StorageLocationSearchResult | null>(null);

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {entries.map((entry) => (
          <li key={entry.scanId} className="flex items-center gap-3 px-3 py-2">
            {!onOpenLocation && (
              <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground/70">
                {t("cards.position", { position: entry.position })}
              </span>
            )}
            <div className="relative aspect-[2.5/3.5] w-8 shrink-0 overflow-hidden rounded-md bg-muted">
              {entry.card.image?.small && (
                <img
                  src={entry.card.image.small}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              {entry.isFoil && <FoilOverlay />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm text-foreground">
                {entry.card.name}
              </span>
              <span className="truncate text-xs text-foreground/70">
                {`${entry.card.setName} (${entry.card.set.toUpperCase()}) #${entry.card.collectorNumber}`}
                {entry.isFoil && ` · ${entry.foilType ?? t("cards.foil")}`}
              </span>
            </div>
            <span className="hidden shrink-0 truncate text-xs text-foreground/70 sm:inline">
              {entry.collectionName}
            </span>
            {onOpenLocation && (
              <Button
                variant="outline"
                size="sm"
                className="max-w-40 shrink-0"
                title={t("search.openLocation")}
                onClick={() => onOpenLocation(entry.locationGuid)}
              >
                <IconBox />
                <span className="truncate">
                  {t("cardLocation.value", {
                    name: entry.locationName,
                    position: entry.position,
                  })}
                </span>
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label={t("cards.remove")}
              title={t("cards.remove")}
              disabled={isRemoving}
              onClick={() => setPendingRemoval(entry)}
            >
              <IconBoxOff />
            </Button>
          </li>
        ))}
      </ul>
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
