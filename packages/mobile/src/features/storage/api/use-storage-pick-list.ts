import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { EMPTY_STORED_STORAGE_PICK_LIST, storagePickListEntries } from "@magic-vault/shared";
import { removeCardsFromStorageLocations, storagePickListQueryOptions } from "@/features/storage/api/storage";
import { useStoredPickList } from "@/features/storage/lib/pick-list-store";
import { useActiveOrgId } from "@/hooks/use-org";
import type { StoragePickListState } from "@/lib/interfaces/storage";

export function useStoragePickList(): StoragePickListState {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const [stored, update] = useStoredPickList(orgId);
  const entries = useMemo(() => storagePickListEntries(stored.decklist), [stored.decklist]);
  const pickedScanIds = useMemo(() => new Set(stored.pickedScanIds), [stored.pickedScanIds]);
  const pickList = useQuery(storagePickListQueryOptions(orgId, entries));
  const cards = useMemo(() => pickList.data?.cards ?? [], [pickList.data?.cards]);

  const setPicked = useCallback(
    (scanId: string, picked: boolean) =>
      update((current) => ({
        ...current,
        pickedScanIds: picked
          ? [...new Set([...current.pickedScanIds, scanId])]
          : current.pickedScanIds.filter((id) => id !== scanId),
      })),
    [update],
  );

  const finish = useMutation({
    mutationFn: removeCardsFromStorageLocations,
    onSuccess: () => {
      update(() => EMPTY_STORED_STORAGE_PICK_LIST);
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    },
  });

  return {
    decklist: stored.decklist,
    entries,
    lines: pickList.data?.lines ?? [],
    cards,
    pickedScanIds,
    pickedCount: cards.filter((card) => pickedScanIds.has(card.scanId)).length,
    isLoading: entries.length > 0 && pickList.isPending,
    isError: pickList.isError,
    isFinishing: finish.isPending,
    finishFailed: finish.isError,
    setDecklist: (decklist) => update((current) => ({ ...current, decklist })),
    setPicked,
    clear: () => update(() => EMPTY_STORED_STORAGE_PICK_LIST),
    finish: () => finish.mutate(cards.filter((card) => pickedScanIds.has(card.scanId)).map((card) => card.scanId)),
    refetch: () => void pickList.refetch(),
  };
}
