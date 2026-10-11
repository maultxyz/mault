import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { storageLocationCardsQueryOptions } from "@/features/storage/api/storage-locations";
import { StorageCardList } from "@/features/storage/components/storage-card-list";
import type { StorageLocationCardsProps } from "@/lib/interfaces/storage";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

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

  return <StorageCardList entries={entries} onOpenCard={onOpenCard} />;
}
