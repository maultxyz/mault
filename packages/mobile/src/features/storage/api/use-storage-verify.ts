import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { EMPTY_STORED_STORAGE_VERIFY, STORAGE_VERIFY_CARDS_MAX, storageVerifyNameCounts } from "@magic-vault/shared";
import { storageVerifyCardsQueryOptions } from "@/features/storage/api/storage";
import { useStoredVerify } from "@/features/storage/lib/pick-list-store";
import { useActiveOrgId } from "@/hooks/use-org";
import type { StorageVerifyState } from "@/lib/interfaces/storage";

export function useStorageVerify(locationGuid: string | undefined): StorageVerifyState {
  const orgId = useActiveOrgId();
  const [stored, update] = useStoredVerify(orgId, locationGuid ?? "");
  const query = useQuery(storageVerifyCardsQueryOptions(locationGuid));
  const cards = useMemo(() => query.data ?? [], [query.data]);
  const verifiedScanIds = useMemo(() => new Set(stored.verifiedScanIds), [stored.verifiedScanIds]);
  const notInLocation = useMemo(
    () => storageVerifyNameCounts(stored.notInLocationCardNames),
    [stored.notInLocationCardNames],
  );

  const setVerified = useCallback(
    (scanId: string, verified: boolean) =>
      update((current) => ({
        ...current,
        verifiedScanIds: verified
          ? [...new Set([...current.verifiedScanIds, scanId])]
          : current.verifiedScanIds.filter((id) => id !== scanId),
      })),
    [update],
  );

  const addNotInLocation = useCallback(
    (cardName: string) =>
      update((current) => ({ ...current, notInLocationCardNames: [...current.notInLocationCardNames, cardName] })),
    [update],
  );

  return {
    cards,
    verifiedScanIds,
    verifiedCount: cards.filter((card) => verifiedScanIds.has(card.scanId)).length,
    notInLocation,
    isLoading: !!locationGuid && query.isPending,
    isError: query.isError,
    isTruncated: cards.length >= STORAGE_VERIFY_CARDS_MAX,
    setVerified,
    addNotInLocation,
    startOver: () => update(() => EMPTY_STORED_STORAGE_VERIFY),
    refetch: () => void query.refetch(),
  };
}
