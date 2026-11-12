import { useOrg } from "@/features/companies/api/use-organization";
import { storageVerifyCardsQueryOptions } from "@/features/storage/api/storage-locations";
import { storageVerifyStorageKey } from "@/features/storage/lib/storage-keys";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { StorageVerifyState } from "@/lib/interfaces/storage";
import {
  EMPTY_STORED_STORAGE_VERIFY,
  parseStoredStorageVerify,
  STORAGE_VERIFY_CARDS_MAX,
  storageVerifyNameCounts,
  type StoredStorageVerify,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

function readStoredText(stored: string | null): string {
  return stored ?? "";
}

export function useStorageVerify(locationGuid: string): StorageVerifyState {
  const { activeOrg } = useOrg();
  const [storedText, setStoredText] = usePersistedState(
    storageVerifyStorageKey(activeOrg?.id, locationGuid),
    readStoredText,
  );
  const stored = useMemo(
    () => parseStoredStorageVerify(storedText),
    [storedText],
  );
  const latestStored = useRef(stored);
  latestStored.current = stored;
  const save = useCallback(
    (next: StoredStorageVerify) => {
      latestStored.current = next;
      setStoredText(JSON.stringify(next));
    },
    [setStoredText],
  );
  const { data, isPending, isError } = useQuery(
    storageVerifyCardsQueryOptions(locationGuid),
  );
  const cards = useMemo(() => data ?? [], [data]);
  const verifiedScanIds = useMemo(
    () => new Set(stored.verifiedScanIds),
    [stored.verifiedScanIds],
  );
  const notInLocation = useMemo(
    () => storageVerifyNameCounts(stored.notInLocationCardNames),
    [stored.notInLocationCardNames],
  );

  const setVerified = useCallback(
    (scanId: string, verified: boolean) => {
      const current = latestStored.current;
      save({
        ...current,
        verifiedScanIds: verified
          ? [...new Set([...current.verifiedScanIds, scanId])]
          : current.verifiedScanIds.filter((id) => id !== scanId),
      });
    },
    [save],
  );

  const addNotInLocation = useCallback(
    (cardName: string) => {
      const current = latestStored.current;
      save({
        ...current,
        notInLocationCardNames: [...current.notInLocationCardNames, cardName],
      });
    },
    [save],
  );

  return {
    cards,
    verifiedScanIds,
    verifiedCount: cards.filter((card) => verifiedScanIds.has(card.scanId))
      .length,
    notInLocation,
    isLoading: isPending,
    isError,
    isTruncated: cards.length >= STORAGE_VERIFY_CARDS_MAX,
    setVerified,
    addNotInLocation,
    startOver: () => save(EMPTY_STORED_STORAGE_VERIFY),
  };
}
