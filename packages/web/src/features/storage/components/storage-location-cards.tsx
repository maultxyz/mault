import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { ListPagination } from "@/components/list-pagination";
import { storageLocationCardPageQueryOptions } from "@/features/storage/api/storage-locations";
import { StorageCardList } from "@/features/storage/components/storage-card-list";
import { STORAGE_PAGE_SEARCH_PARAM } from "@/lib/constants/storage";
import type { StorageLocationCardsProps } from "@/lib/interfaces/storage";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function StorageLocationCards({
  location,
  onOpenCard,
}: StorageLocationCardsProps) {
  const { t } = useTranslation("storage");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Math.max(
    Number(searchParams.get(STORAGE_PAGE_SEARCH_PARAM)) || 1,
    1,
  );
  const { data, isPending, isPlaceholderData } = useQuery(
    storageLocationCardPageQueryOptions(location.guid, requestedPage),
  );
  const entries = useMemo(
    () =>
      (data?.cards ?? []).map((card) => ({
        ...card,
        locationGuid: location.guid,
        locationName: location.name,
      })),
    [data?.cards, location.guid, location.name],
  );
  const topRef = useRef<HTMLDivElement>(null);
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 1;
  const page = data?.page ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

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

  if (isPending || (isPlaceholderData && data?.page !== requestedPage)) {
    return <ListSkeleton />;
  }

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
      <StorageCardList entries={entries} onOpenCard={onOpenCard} />
      <ListPagination
        pagination={{
          page,
          pageCount,
          setPage: goToPage,
          from: start + 1,
          to: start + entries.length,
          total,
        }}
      />
    </div>
  );
}
