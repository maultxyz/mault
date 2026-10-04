import { EmptyState } from "@/components/empty-state";
import { FoilOverlay } from "@/components/foil-overlay";
import { ListSkeleton } from "@/components/list-skeleton";
import { storageLocationCardsQueryOptions } from "@/features/storage/api/storage-locations";
import type { StorageLocationCardsProps } from "@/lib/interfaces/storage";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function StorageLocationCards({ location }: StorageLocationCardsProps) {
  const { t } = useTranslation("storage");
  const { data: cards = [], isPending } = useQuery(
    storageLocationCardsQueryOptions(location.guid),
  );

  if (isPending) return <ListSkeleton />;

  if (cards.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCards}
        title={t("cards.emptyTitle")}
        description={t("cards.emptyDescription")}
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {cards.map((entry) => (
        <li key={entry.scanId} className="flex items-center gap-3 px-3 py-2">
          <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground/70">
            {t("cards.position", { position: entry.position })}
          </span>
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
              {entry.isFoil &&
                ` · ${entry.foilType ?? t("cards.foil")}`}
            </span>
          </div>
          <span className="shrink-0 truncate text-xs text-foreground/70">
            {entry.collectionName}
          </span>
        </li>
      ))}
    </ul>
  );
}
