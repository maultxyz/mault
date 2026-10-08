import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { storageSearchQueryOptions } from "@/features/storage/api/storage-locations";
import { StorageCardList } from "@/features/storage/components/storage-card-list";
import type { StorageSearchResultsProps } from "@/lib/interfaces/storage";
import { STORAGE_SEARCH_RESULT_LIMIT } from "@magic-vault/shared";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function StorageSearchResults({
  query,
  onOpenLocation,
  onOpenCard,
}: StorageSearchResultsProps) {
  const { t } = useTranslation("storage");
  const { data: results = [], isPending } = useQuery(
    storageSearchQueryOptions(query),
  );

  if (isPending) return <ListSkeleton />;

  if (results.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconSearch}
        title={t("search.emptyTitle")}
        description={t("search.emptyDescription", { query })}
      />
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-foreground/70">
        {results.length >= STORAGE_SEARCH_RESULT_LIMIT
          ? t("search.limited", { count: results.length })
          : t("search.count", { count: results.length })}
      </p>
      <StorageCardList
        entries={results}
        onOpenLocation={onOpenLocation}
        onOpenCard={onOpenCard}
      />
    </section>
  );
}
