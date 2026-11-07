import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  readScanTargetGuidsByOrgId,
  saveScanTargetGuid,
  subscribeToScanTargets,
} from "@/features/collections/lib/scan-target";
import { useActiveOrgId } from "@/hooks/use-org";
import type { ScanTarget } from "@/lib/interfaces/collections";

export function useScanTarget(): ScanTarget {
  const orgId = useActiveOrgId();
  const collectionsQuery = useQuery(collectionsQueryOptions(orgId));
  const collections = collectionsQuery.data ?? [];
  const scanTargetGuidsByOrgId = useSyncExternalStore(subscribeToScanTargets, readScanTargetGuidsByOrgId);
  const storedGuid = orgId ? scanTargetGuidsByOrgId[orgId] : undefined;
  const collection =
    collections.find((candidate) => candidate.guid === storedGuid) ??
    collections.find((candidate) => candidate.isActive) ??
    collections[0] ??
    null;
  const setScanTargetGuid = useCallback(
    (collectionGuid: string) => {
      if (orgId) saveScanTargetGuid(orgId, collectionGuid);
    },
    [orgId],
  );
  return { collection, collections, collectionsQuery, setScanTargetGuid };
}
