import { useEffect } from "react";
import {
  COLLECTION_VIEW_MEMORY_KEY_PREFIX,
  LAST_OPENED_COLLECTION_KEY_PREFIX,
} from "@/lib/constants/navigation-memory";
import type { CollectionViewMemory } from "@/lib/interfaces/navigation-memory";
import { readKv, readKvJson, writeKv, writeKvJson } from "@/lib/storage/kv";

function viewMemoryKey(orgId: string, collectionGuid: string): string {
  return `${COLLECTION_VIEW_MEMORY_KEY_PREFIX}:${orgId}:${collectionGuid}`;
}

function lastOpenedCollectionKey(orgId: string): string {
  return `${LAST_OPENED_COLLECTION_KEY_PREFIX}:${orgId}`;
}

export function readCollectionViewMemory(orgId: string | null, collectionGuid: string): CollectionViewMemory | null {
  if (!orgId) return null;
  return readKvJson<CollectionViewMemory | null>(viewMemoryKey(orgId, collectionGuid), null);
}

export function writeCollectionViewMemory(orgId: string | null, collectionGuid: string, memory: CollectionViewMemory): void {
  if (!orgId) return;
  writeKvJson(viewMemoryKey(orgId, collectionGuid), memory);
}

export function readLastOpenedCollectionGuid(orgId: string | null): string | null {
  return orgId ? readKv(lastOpenedCollectionKey(orgId)) : null;
}

export function useRecordLastOpenedCollection(orgId: string | null, collectionGuid: string): void {
  useEffect(() => {
    if (orgId && collectionGuid) writeKv(lastOpenedCollectionKey(orgId), collectionGuid);
  }, [orgId, collectionGuid]);
}
