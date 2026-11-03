import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useMoveCardsToCollection(sourceCollectionGuid: string | undefined) {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { moveCardsToCollection } = useScannedCards();
  const [isMovingToCollection, setIsMovingToCollection] = useState(false);

  const moveToCollection = async (
    scanIds: string[],
    targetCollectionGuid: string,
  ): Promise<boolean> => {
    if (!sourceCollectionGuid) return false;
    const targetName =
      queryClient
        .getQueryData(collectionsQueryOptions.queryKey)
        ?.find((collection) => collection.guid === targetCollectionGuid)
        ?.name ?? "";
    setIsMovingToCollection(true);
    const moved = await moveCardsToCollection({
      sourceCollectionGuid,
      targetCollectionGuid,
      scanIds,
    }).finally(() => setIsMovingToCollection(false));
    if (moved == null) {
      toast.error(t("toasts.moveToCollectionFailed"));
      return false;
    }
    toast.success(
      t("toasts.cardsMovedToCollection", { count: moved, name: targetName }),
    );
    return true;
  };

  return { moveToCollection, isMovingToCollection };
}
