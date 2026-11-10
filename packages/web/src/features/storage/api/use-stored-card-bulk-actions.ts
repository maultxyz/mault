import {
  removeCollectionCards,
  setCollectionCardTags,
  setCollectionCardsCondition,
  setCollectionCardsFoilType,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import {
  moveCardsToStorageLocation,
  removeCardsFromStorageLocations,
  storageLocationKeys,
} from "@/features/storage/api/storage-locations";
import { toast } from "@/lib/toast";
import type {
  CardCondition,
  CardTag,
  Result,
  StorageLocationCardReference,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function scanIdsByCollection(references: StorageLocationCardReference[]) {
  const grouped = new Map<string, string[]>();
  for (const { scanId, collectionGuid } of references) {
    grouped.set(collectionGuid, [...(grouped.get(collectionGuid) ?? []), scanId]);
  }
  return grouped;
}

export function useStoredCardBulkActions() {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const refresh = (collectionGuids: Iterable<string>) => {
    void queryClient.invalidateQueries({ queryKey: storageLocationKeys.root() });
    for (const collectionGuid of collectionGuids) {
      void invalidateCollectionCards(queryClient, collectionGuid);
    }
  };

  const runPerCollection = async (
    references: StorageLocationCardReference[],
    request: (
      collectionGuid: string,
      scanIds: string[],
    ) => Promise<Result<unknown>>,
  ) => {
    const grouped = scanIdsByCollection(references);
    setIsUpdating(true);
    try {
      const results = await Promise.all(
        [...grouped].map(([collectionGuid, scanIds]) =>
          request(collectionGuid, scanIds),
        ),
      );
      const succeeded = results.every((result) => result.success);
      if (!succeeded) toast.error(t("toasts.failed"));
      return succeeded;
    } catch (error) {
      console.error("Failed to update stored cards:", error);
      toast.error(t("toasts.failed"));
      return false;
    } finally {
      setIsUpdating(false);
      refresh(grouped.keys());
    }
  };

  return {
    isUpdating,
    setFoilType: (
      references: StorageLocationCardReference[],
      foilType: string | null,
    ) =>
      runPerCollection(references, (collectionGuid, scanIds) =>
        setCollectionCardsFoilType(collectionGuid, scanIds, foilType),
      ),
    setCondition: (
      references: StorageLocationCardReference[],
      condition: CardCondition,
    ) =>
      runPerCollection(references, (collectionGuid, scanIds) =>
        setCollectionCardsCondition(collectionGuid, scanIds, condition),
      ),
    setTags: (
      references: StorageLocationCardReference[],
      tags: CardTag[],
      enabled: boolean,
    ) =>
      runPerCollection(references, (collectionGuid, scanIds) =>
        setCollectionCardTags(collectionGuid, { scanIds, tags, enabled }),
      ),
    deleteCards: (references: StorageLocationCardReference[]) =>
      runPerCollection(references, (collectionGuid, scanIds) =>
        removeCollectionCards(collectionGuid, scanIds),
      ),
    moveToLocation: async (
      references: StorageLocationCardReference[],
      locationGuid: string,
    ) => {
      setIsUpdating(true);
      try {
        const result = await moveCardsToStorageLocation(
          locationGuid,
          references.map((reference) => reference.scanId),
        );
        if (!result.success || !result.data) {
          toast.error(result.message ?? t("toasts.failed"));
          return false;
        }
        toast.success(t("toasts.cardsMoved", { count: result.data.moved }));
        return true;
      } catch (error) {
        console.error("Failed to move stored cards:", error);
        toast.error(t("toasts.failed"));
        return false;
      } finally {
        setIsUpdating(false);
        refresh(scanIdsByCollection(references).keys());
      }
    },
    removeFromLocation: async (references: StorageLocationCardReference[]) => {
      setIsUpdating(true);
      try {
        const result = await removeCardsFromStorageLocations(
          references.map((reference) => reference.scanId),
        );
        if (!result.success || !result.data) {
          toast.error(result.message ?? t("toasts.failed"));
          return false;
        }
        toast.success(
          t("pickList.toasts.removed", { count: result.data.removed }),
        );
        return true;
      } catch (error) {
        console.error("Failed to remove stored cards:", error);
        toast.error(t("toasts.failed"));
        return false;
      } finally {
        setIsUpdating(false);
        refresh(scanIdsByCollection(references).keys());
      }
    },
  };
}
