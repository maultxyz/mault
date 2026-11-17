import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScanRemovalEntry,
  resolveRemovalBinNumber,
  scanIdsToRemove,
  scanRemovalCandidateCardIds,
  type PlayingCardWithDistance,
  type ScanRemovalEntry,
} from "@magic-vault/shared";
import {
  fetchCollectionCardCopies,
  invalidateCollectionCards,
  removeCollectionCards,
} from "@/features/collections/api/collection-cards";
import { SCAN_REMOVAL_NOTICE_DURATION_MS } from "@/lib/constants/scanner";
import type {
  ScanRemovalInputs,
  ScanRemovalNotice,
  ScanRemovalNoticeKind,
  ScanRemovalValue,
} from "@/lib/interfaces/scanner";

export function useScanRemoval({ collectionGuid, binConfigs }: ScanRemovalInputs): ScanRemovalValue {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(false);
  const [entries, setEntries] = useState<ScanRemovalEntry[]>([]);
  const [notice, setNotice] = useState<ScanRemovalNotice | null>(null);
  const [chosenRemovalBinNumber, setRemovalBinNumber] = useState<number | null>(null);
  const isActive = isEnabled && !!collectionGuid;
  const removalBinNumber = resolveRemovalBinNumber(binConfigs, chosenRemovalBinNumber);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const collectionGuidRef = useRef(collectionGuid);
  collectionGuidRef.current = collectionGuid;

  useEffect(() => {
    setEntries([]);
  }, [collectionGuid]);

  useEffect(() => {
    if (!notice) return;
    const dismissTimer = setTimeout(() => setNotice(null), SCAN_REMOVAL_NOTICE_DURATION_MS);
    return () => clearTimeout(dismissTimer);
  }, [notice]);

  const showNotice = useCallback(
    (kind: ScanRemovalNoticeKind, details: Omit<ScanRemovalNotice, "noticeId" | "kind"> = {}) =>
      setNotice({ noticeId: Crypto.randomUUID(), kind, ...details }),
    [],
  );

  const showNoMatchNotice = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    showNotice("no-match");
  }, [showNotice]);

  const queueMatchedCardForRemoval = useCallback(
    (matchedCard: PlayingCardWithDistance, alternativeMatches: PlayingCardWithDistance[]) => {
      const lookupCollectionGuid = collectionGuidRef.current;
      if (!lookupCollectionGuid) return Promise.resolve(false);
      const candidateCardIds = scanRemovalCandidateCardIds(matchedCard, alternativeMatches);
      return fetchCollectionCardCopies(lookupCollectionGuid, candidateCardIds)
        .then((copies) => {
          if (collectionGuidRef.current !== lookupCollectionGuid) return false;
          const entry = createScanRemovalEntry({
            entryId: Crypto.randomUUID(),
            matchedCard,
            copies,
            existingEntries: entriesRef.current,
          });
          entriesRef.current = [entry, ...entriesRef.current];
          setEntries((currentEntries) => [entry, ...currentEntries]);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          return entry.selectedScanId != null;
        })
        .catch((error: unknown) => {
          console.warn("Looking up copies to remove failed", error);
          showNotice("lookup-failed", { cardName: matchedCard.name });
          return false;
        });
    },
    [showNotice],
  );

  const selectCopyForEntry = useCallback((entryId: string, scanId: string) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.entryId === entryId ? { ...entry, selectedScanId: scanId } : entry)),
    );
  }, []);

  const dropEntry = useCallback((entryId: string) => {
    setEntries((currentEntries) => currentEntries.filter((entry) => entry.entryId !== entryId));
  }, []);

  const removeQueued = useMutation({
    mutationFn: ({ guid, scanIds }: { guid: string; scanIds: string[] }) => removeCollectionCards(guid, scanIds),
    onSettled: (_result, _error, { guid }) => invalidateCollectionCards(queryClient, guid),
  });

  const removeQueuedCopies = useCallback(async () => {
    const guid = collectionGuidRef.current;
    const scanIds = scanIdsToRemove(entries);
    if (!guid || scanIds.length === 0) return;
    const submittedEntryIds = new Set(entries.map((entry) => entry.entryId));
    await removeQueued.mutateAsync({ guid, scanIds });
    setEntries((currentEntries) => currentEntries.filter((entry) => !submittedEntryIds.has(entry.entryId)));
    showNotice("removed", { removedCount: scanIds.length });
  }, [entries, removeQueued, showNotice]);

  return {
    isEnabled,
    setIsEnabled,
    isActive,
    removalBinNumber,
    setRemovalBinNumber,
    entries,
    queueMatchedCardForRemoval,
    showNoMatchNotice,
    notice,
    selectCopyForEntry,
    dropEntry,
    isRemovingQueuedCopies: removeQueued.isPending,
    removeQueuedCopies,
  };
}
