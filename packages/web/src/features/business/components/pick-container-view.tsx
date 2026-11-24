import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import { SkeletonStatus } from "@/components/skeleton-status";
import { PickRowsSkeleton } from "@/features/business/components/pick-rows-skeleton";
import {
  storageLocationCardPageQueryOptions,
} from "@/features/storage/api/storage-locations";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type { PickContainerViewProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import {
  STORAGE_CARDS_PAGE_SIZE_MAX,
  type PickWalkStop,
  type StorageLocationCard,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";import {
  IconArrowsSort,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = STORAGE_CARDS_PAGE_SIZE_MAX;

type ContainerCard = {
  name: string;
  image: StorageLocationCard["card"]["image"];
  set: string;
  setName: string;
  collectorNumber: string | null;
};

export function PickContainerView({
  stops,
  pickedScanIds,
  canPick,
  onToggle,
  onSorterPick,
}: PickContainerViewProps) {
  const { t } = useTranslation("business");
  const [stopIndex, setStopIndex] = useState(0);
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const stop = stops[Math.min(stopIndex, stops.length - 1)] as
    | PickWalkStop
    | undefined;
  const stopKey = stop?.stopKey ?? null;

  useEffect(() => {
    setPagesLoaded(1);
  }, [stopKey]);

  const locationGuid = stop?.locationGuid ?? null;
  const cardsQuery = useQuery({
    ...storageLocationCardPageQueryOptions(
      locationGuid ?? undefined,
      ALL_CARDS_QUERY,
      1,
      Math.min(PAGE_SIZE * pagesLoaded, PAGE_SIZE * 5),
    ),
  });

  const pickEntriesByScanId = useMemo(() => {
    const map = new Set<string>();
    for (const walkStop of stops) {
      for (const entry of walkStop.entries) map.add(entry.scanId);
    }
    return map;
  }, [stops]);

  if (!stop) return null;

  const pickCards = stop.entries;
  const pickedInStop = pickCards.filter((entry) =>
    pickedScanIds.has(entry.scanId),
  ).length;
  const goToStop = (next: number) =>
    setStopIndex(Math.max(0, Math.min(next, stops.length - 1)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label={t("orders.batch.boxPrevious")}
          title={t("orders.batch.boxPrevious")}
          disabled={stopIndex === 0}
          onClick={() => goToStop(stopIndex - 1)}
        >
          <IconChevronLeft />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-heading text-sm font-semibold">
            {stop.locationName ?? stop.collectionName}
          </p>
          <p className="text-xs tabular-nums text-foreground/70">
            {t("orders.batch.boxStopOf", {
              index: stopIndex + 1,
              total: stops.length,
            })}
            {" · "}
            {t("orders.pickWalk.stopProgress", {
              picked: pickedInStop,
              total: pickCards.length,
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("orders.batch.boxNext")}
          title={t("orders.batch.boxNext")}
          disabled={stopIndex >= stops.length - 1}
          onClick={() => goToStop(stopIndex + 1)}
        >
          <IconChevronRight />
        </Button>
      </div>

      {locationGuid == null && (
        <p className="rounded-lg border bg-muted/40 px-2 py-1.5 text-xs text-foreground/70">
          {t("orders.batch.boxCollectionNote")}
        </p>
      )}

      {onSorterPick && canPick && stop.locationGuid != null && (
        <Button
          variant="outline"
          className="max-md:min-h-12"
          title={t("orders.sorterPick.stopButtonHint", {
            location: stop.locationName,
          })}
          onClick={() => onSorterPick(stop)}
        >
          <IconArrowsSort />
          {t("orders.sorterPick.stopButton")}
        </Button>
      )}

      {locationGuid == null ? (
        <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-border">
          {pickCards.map((entry) => {
            const isPicked = pickedScanIds.has(entry.scanId);
            return (
              <ContainerRow
                key={entry.scanId}
                position={entry.locationPosition}
                card={entry.card}
                isFoil={entry.isFoil}
                condition={entry.condition}
                isPickCard
                isPicked={isPicked}
                canPick={canPick}
                onToggle={() => onToggle(entry.scanId, !isPicked)}
              />
            );
          })}
        </div>
      ) : cardsQuery.isLoading ? (
        <SkeletonStatus>
          <PickRowsSkeleton rows={6} />
        </SkeletonStatus>
      ) : cardsQuery.data ? (
        <>
          <p className="text-xs tabular-nums text-foreground/70" role="status">
            {t("orders.batch.boxPickSummary", {
              picked: pickedInStop,
              pickTotal: pickCards.length,
            })}
          </p>
          <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-border">
            {cardsQuery.data.cards.map((card) => {
              const isPickCard = pickEntriesByScanId.has(card.scanId);
              const isPicked = pickedScanIds.has(card.scanId);
              return (
                <ContainerRow
                  key={card.scanId}
                  position={card.position - 1}
                  card={card.card}
                  isFoil={card.isFoil}
                  condition={card.condition}
                  isPickCard={isPickCard}
                  isPicked={isPicked}
                  canPick={canPick}
                  onToggle={() => onToggle(card.scanId, !isPicked)}
                />
              );
            })}
          </div>
          {cardsQuery.data.cards.length < cardsQuery.data.total && (
            <Button
              variant="outline"
              onClick={() => setPagesLoaded((current) => current + 1)}
            >
              {t("orders.batch.boxLoadMore")}
            </Button>
          )}
        </>
      ) : (
        <p className="text-xs text-foreground/70">{t("errors.loadFailed")}</p>
      )}
    </div>
  );
}

function ContainerRow({
  position,
  card,
  isFoil,
  condition,
  isPickCard,
  isPicked,
  canPick,
  onToggle,
}: {
  position: number | null;
  card: ContainerCard;
  isFoil: boolean;
  condition: string;
  isPickCard: boolean;
  isPicked: boolean;
  canPick: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("business");
  return (
    <Button
      variant="ghost"
      aria-pressed={isPickCard ? isPicked : undefined}
      disabled={!isPickCard || !canPick}
      className={cn(
        "h-auto w-full items-center justify-start gap-2.5 rounded-none p-2 text-start max-md:min-h-12 max-md:gap-3 max-md:p-3",
        isPickCard && !isPicked && "bg-primary/5",
        isPicked && "bg-success/5 text-foreground/60",
      )}
      aria-label={isPickCard ? t("orders.pickCopy", { name: card.name }) : undefined}
      onClick={onToggle}
    >
      {isPickCard ? (
        isPicked ? (
          <IconCircleCheckFilled className="size-4 shrink-0 text-success-foreground" />
        ) : (
          <IconCircle className="size-4 shrink-0 text-primary" />
        )
      ) : (
        <span className="flex w-4 shrink-0 justify-center text-2xs tabular-nums text-foreground/40">
          {(position ?? 0) + 1}
        </span>
      )}
      <CardThumbnail image={card.image} className="w-10 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span
          className={cn(
            "w-full truncate text-sm font-medium",
            isPicked && "line-through decoration-1",
          )}
        >
          {card.name}
        </span>
        <span className="w-full truncate text-xs text-foreground/70">
          {[
            card.setName || card.set.toUpperCase(),
            card.collectorNumber ? `#${card.collectorNumber}` : null,
            condition,
            isFoil ? t("table.foil") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {isPickCard && (
        <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold text-primary">
          <IconCheck className="size-3" />
          {t("orders.batch.boxPickBadge")}
        </span>
      )}
    </Button>
  );
}
