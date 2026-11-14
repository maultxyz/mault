import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { EMPTY_STORED_STORAGE_PICK_LIST, storagePickListEntries } from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { removeCardsFromStorageLocations, storagePickListQueryOptions } from "@/features/storage/api/storage";
import { useStoredPickList } from "@/features/storage/lib/pick-list-store";
import { useActiveOrgId } from "@/hooks/use-org";
import { TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import type { StoragePickListState } from "@/lib/interfaces/storage";

export function useStoragePickList(): StoragePickListState {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();
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
    clear: () => {
      const previous = stored;
      update(() => EMPTY_STORED_STORAGE_PICK_LIST);
      showToast({
        message: t("recovery.pickListCleared"),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: {
          label: t("recovery.undo"),
          onPress: () => {
            update(() => previous);
            AccessibilityInfo.announceForAccessibility(t("recovery.restored"));
          },
        },
      });
    },
    finish: () => finish.mutate(cards.filter((card) => pickedScanIds.has(card.scanId)).map((card) => card.scanId)),
    refetch: () => void pickList.refetch(),
  };
}
