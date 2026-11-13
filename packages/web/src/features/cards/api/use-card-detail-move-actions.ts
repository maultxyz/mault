import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { useMoveTargetCollections } from "@/features/collections/api/use-move-target-collections";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage-locations";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useMoveCardsToLocation } from "@/features/storage/api/use-storage-locations";
import type { UseCardDetailMoveActionsOptions } from "@/lib/interfaces/cards";
import { useQuery } from "@tanstack/react-query";

export function useCardDetailMoveActions({
  scanId,
  collectionGuid,
  canEdit,
  onMovedToCollection,
}: UseCardDetailMoveActionsOptions) {
  const { data: storageLocation } = useQuery(
    cardStorageLocationQueryOptions(collectionGuid, scanId),
  );
  const { isLocked: storageLocked } = useStorageAccess();
  const { moveCards, isMoving } = useMoveCardsToLocation();
  const targetCollections = useMoveTargetCollections(
    canEdit ? collectionGuid : undefined,
  );
  const { moveToCollection, isMovingToCollection } =
    useMoveCardsToCollection(collectionGuid);

  return {
    storageLocationGuid: storageLocation?.guid,
    canMoveToLocation: canEdit && !!scanId && !storageLocked,
    canMoveToCollection: canEdit && !!scanId && targetCollections.length > 0,
    isMoving: isMoving || isMovingToCollection,
    moveToLocation: async (locationGuid: string) =>
      !!scanId &&
      moveCards({ guid: locationGuid, scanIds: [scanId], collectionGuid }),
    moveToCollection: async (targetCollectionGuid: string) => {
      if (!scanId) return false;
      const moved = await moveToCollection([scanId], targetCollectionGuid);
      if (moved) onMovedToCollection();
      return moved;
    },
  };
}
