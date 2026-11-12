import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { ListSkeleton } from "@/components/list-skeleton";
import { PublicCardTile } from "@/features/public-cards/components/public-card-tile";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import type { PublicCardResultsProps } from "@/lib/interfaces/public-cards";
import { PUBLIC_CARDS_PAGE_SIZE } from "@magic-vault/shared";
import { IconCards } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PublicCardResults({
  info,
  page: cardPage,
  isPending,
  isError,
  onPageChange,
  onOpenCard,
}: PublicCardResultsProps) {
  const { t } = useTranslation("cards");
  const cards = cardPage?.cards ?? [];
  const pageSize = cardPage?.pageSize ?? PUBLIC_CARDS_PAGE_SIZE;
  const page = cardPage?.page ?? 1;
  const total = cardPage?.total ?? 0;
  const start = (page - 1) * pageSize;
  const pagination = {
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    setPage: onPageChange,
    from: start + 1,
    to: start + cards.length,
    total,
  };

  return (
    <div className="@container flex flex-col gap-4">
      <p role="status" className="sr-only">
        {isPending ? "" : t("publicBrowse.resultCount", { count: total })}
      </p>
      {info.cardCount === 0 ? (
        <EmptyState icon={IconCards} title={t("publicBrowse.empty")} />
      ) : isError ? (
        <EmptyState icon={IconCards} title={t("publicBrowse.loadFailed")} />
      ) : isPending ? (
        <ListSkeleton />
      ) : cards.length === 0 ? (
        <EmptyState icon={IconCards} title={t("publicBrowse.noResults")} />
      ) : (
        <>
          <ListPagination alignsEnd pagination={pagination} />
          <div className={CARD_GRID_CLASS}>
            {cards.map((entry) => (
              <PublicCardTile key={entry.scanId} entry={entry} onOpen={onOpenCard} />
            ))}
          </div>
          <ListPagination alignsEnd pagination={pagination} />
        </>
      )}
    </div>
  );
}
