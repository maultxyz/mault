import { MOVE_TARGET_COLLECTION_PREFIX } from "@/lib/constants/storage";

export function collectionMoveTarget(collectionGuid: string): string {
  return `${MOVE_TARGET_COLLECTION_PREFIX}${collectionGuid}`;
}

export function collectionGuidFromMoveTarget(target: string): string | null {
  return target.startsWith(MOVE_TARGET_COLLECTION_PREFIX)
    ? target.slice(MOVE_TARGET_COLLECTION_PREFIX.length)
    : null;
}
