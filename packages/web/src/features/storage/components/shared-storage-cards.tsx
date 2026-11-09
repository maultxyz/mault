import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { ListSkeleton } from "@/components/list-skeleton";
import { fetchSharedStorageCards } from "@/features/storage/api/storage-share-links";
import { SharedStorageCardTile } from "@/features/storage/components/shared-storage-card-tile";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import type { SharedStorageCardsProps } from "@/lib/interfaces/share-links";
import { STORAGE_CARDS_PAGE_SIZE } from "@magic-vault/shared";
import { IconCards } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SharedStorageCards({ token, cardCount }: SharedStorageCardsProps) {
  const { t } = useTranslation("storage");
  const [requestedPage, setRequestedPage] = useState(1);
  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: ["shared-storage-cards", token, requestedPage],
    queryFn: () =>
      fetchSharedStorageCards(token, requestedPage, STORAGE_CARDS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  if (cardCount === 0) {
    return <EmptyState icon={IconCards} title={t("sharedPage.empty")} />;
  }
  if (isPending || (isPlaceholderData && data?.page !== requestedPage)) {
    return <ListSkeleton />;
  }
  const cards = data?.cards ?? [];
  const pageSize = data?.pageSize ?? STORAGE_CARDS_PAGE_SIZE;
  const page = data?.page ?? 1;
  const total = data?.total ?? 0;
  const start = (page - 1) * pageSize;
  const pagination = {
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    setPage: (next: number) => {
      setRequestedPage(next);
      window.scrollTo({ top: 0 });
    },
    from: start + 1,
    to: start + cards.length,
    total,
  };

  return (
    <div className="@container flex flex-col gap-4">
      <div className={CARD_GRID_CLASS}>
        {cards.map((entry) => (
          <SharedStorageCardTile key={entry.scanId} entry={entry} />
        ))}
      </div>
      <ListPagination alignsEnd pagination={pagination} />
    </div>
  );
}
