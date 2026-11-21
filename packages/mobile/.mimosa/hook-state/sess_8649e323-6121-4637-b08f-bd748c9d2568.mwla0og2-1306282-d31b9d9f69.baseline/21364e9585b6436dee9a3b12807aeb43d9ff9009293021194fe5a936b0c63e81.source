import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SCAN_DESTINATION,
  scanDestinationSortsCards,
  scanDestinationStorageLocationGuid,
  type ScanDestination,
} from "@magic-vault/shared";
import { billingQueryOptions } from "@/features/org/api/billing";
import {
  readScanDestinationsByOrgId,
  saveScanDestination,
  subscribeToScanDestinations,
} from "@/features/scanner/lib/scan-destination-store";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import type { ScanDestinationState } from "@/lib/interfaces/scanner";

export function useScanDestination(): ScanDestinationState {
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const canStore = !!billing && billing.storage !== false;
  const locationsQuery = useQuery(storageLocationsQueryOptions(orgId, canStore));
  const storageLocations = locationsQuery.data ?? [];
  const scanDestinationsByOrgId = useSyncExternalStore(subscribeToScanDestinations, readScanDestinationsByOrgId);
  const storedDestination = (orgId ? scanDestinationsByOrgId[orgId] : undefined) ?? DEFAULT_SCAN_DESTINATION;
  const storedLocationGuid = storedDestination.kind === "storage" ? storedDestination.storageLocationGuid : null;
  const storageLocation = storageLocations.find((location) => location.guid === storedLocationGuid) ?? null;
  const storedLocationIsGone = billing?.storage === false || (locationsQuery.isSuccess && !storageLocation);
  const destination: ScanDestination =
    storedDestination.kind === "sort"
      ? storedDestination
      : { kind: "storage", storageLocationGuid: storedLocationIsGone ? null : storedLocationGuid };
  const setDestination = useCallback(
    (next: ScanDestination) => {
      if (orgId) saveScanDestination(orgId, next);
    },
    [orgId],
  );
  return {
    destination,
    storageLocation,
    storageLocations,
    canStore,
    sortsCards: scanDestinationSortsCards(destination, sorter.isReady),
    storageLocationGuid: scanDestinationStorageLocationGuid(destination, sorter.isReady),
    setDestination,
  };
}
