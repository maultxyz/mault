import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { storageLocationCardsQueryOptions } from "@/features/storage/api/storage-locations";
import { StorageCardList } from "@/features/storage/components/storage-card-list";
import {
  STORAGE_CARDS_PAGE_SIZE,
  STORAGE_PAGE_SEARCH_PARAM,
} from "@/lib/constants/storage";
import type { StorageLocationCardsProps } from "@/lib/interfaces/storage";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function StorageLocationCards({
  location,
  onOpenCard,
}: StorageLocationCardsProps) {
  const { t } = useTranslation("storage");
  const { data: cards, isPending } = useQuery(
    storageLocationCardsQueryOptions(location.guid),
  );
  const entries = useMemo(
    () =>
      (cards ?? []).map((card) => ({
        ...card,
        locationGuid: location.guid,
        locationName: location.name,
      })),
    [cards, location.guid, location.name],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(
    1,
    Math.ceil(entries.length / STORAGE_CARDS_PAGE_SIZE),
  );
  const page = Math.min(
    Math.max(Number(searchParams.get(STORAGE_PAGE_SEARCH_PARAM)) || 1, 1),
    pageCount,
  );
  const start = (page - 1) * STORAGE_CARDS_PAGE_SIZE;
  const pageEntries = entries.slice(start, start + STORAGE_CARDS_PAGE_SIZE);

  const goToPage = (next: number) => {
    setSearchParams(
      (params) => {
        if (next > 1) params.set(STORAGE_PAGE_SEARCH_PARAM, String(next));
        else params.delete(STORAGE_PAGE_SEARCH_PARAM);
        return params;
      },
      { replace: true },
    );
    topRef.current?.scrollIntoView({ block: "start" });
  };

  if (isPending) return <ListSkeleton />;

  if (entries.length === 0) {
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
    <div ref={topRef} className="flex scroll-mt-20 flex-col gap-4">
      <StorageCardList entries={pageEntries} onOpenCard={onOpenCard} />
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs tabular-nums text-foreground/70">
            {t("pagination.range", {
              from: start + 1,
              to: start + pageEntries.length,
              total: entries.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <IconChevronLeft />
              {t("pagination.previous")}
            </Button>
            <span className="text-xs tabular-nums text-foreground/70">
              {t("pagination.page", { page, count: pageCount })}
            </span>
            <Button
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => goToPage(page + 1)}
            >
              {t("pagination.next")}
              <IconChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
