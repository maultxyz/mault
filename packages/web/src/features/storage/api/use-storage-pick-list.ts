import { useOrg } from "@/features/companies/api/use-organization";
import {
  removeCardsFromStorageLocations,
  storageLocationKeys,
  storagePickListQueryOptions,
} from "@/features/storage/api/storage-locations";
import { storagePickListStorageKey } from "@/features/storage/lib/storage-keys";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { StoragePickListState } from "@/lib/interfaces/storage";
import { toast } from "@/lib/toast";
import {
  EMPTY_STORED_STORAGE_PICK_LIST,
  parseStoredStoragePickList,
  storagePickListEntries,
  type StoredStoragePickList,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

function readStoredText(stored: string | null): string {
  return stored ?? "";
}

export function useStoragePickList(): StoragePickListState {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const [storedText, setStoredText] = usePersistedState(
    storagePickListStorageKey(activeOrg?.id),
    readStoredText,
  );
  const stored = useMemo(
    () => parseStoredStoragePickList(storedText),
    [storedText],
  );
  const latestStored = useRef(stored);
  latestStored.current = stored;
  const save = useCallback(
    (next: StoredStoragePickList) => {
      latestStored.current = next;
      setStoredText(JSON.stringify(next));
    },
    [setStoredText],
  );
  const entries = useMemo(
    () => storagePickListEntries(stored.decklist),
    [stored.decklist],
  );
  const pickedScanIds = useMemo(
    () => new Set(stored.pickedScanIds),
    [stored.pickedScanIds],
  );
  const {
    data: pickList,
    isPending,
    isError,
  } = useQuery(storagePickListQueryOptions(activeOrg?.id, entries));
  const cards = useMemo(() => pickList?.cards ?? [], [pickList?.cards]);
  const pickedCount = cards.filter((card) =>
    pickedScanIds.has(card.scanId),
  ).length;

  const setPicked = useCallback(
    (scanId: string, picked: boolean) => {
      const current = latestStored.current;
      save({
        ...current,
        pickedScanIds: picked
          ? [...new Set([...current.pickedScanIds, scanId])]
          : current.pickedScanIds.filter((id) => id !== scanId),
      });
    },
    [save],
  );

  const finishMutation = useMutation({
    mutationFn: removeCardsFromStorageLocations,
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("toasts.failed"));
        return;
      }
      toast.success(
        t("pickList.toasts.removed", { count: result.data.removed }),
      );
      save(EMPTY_STORED_STORAGE_PICK_LIST);
      void queryClient.invalidateQueries({
        queryKey: storageLocationKeys.root(),
      });
    },
    onError: () => toast.error(t("toasts.failed")),
  });

  return {
    decklist: stored.decklist,
    entries,
    lines: pickList?.lines ?? [],
    cards,
    pickedScanIds,
    pickedCount,
    isLoading: entries.length > 0 && isPending,
    isError,
    isFinishing: finishMutation.isPending,
    setDecklist: (decklist) => save({ ...latestStored.current, decklist }),
    setPicked,
    clear: () => save(EMPTY_STORED_STORAGE_PICK_LIST),
    finish: () =>
      finishMutation.mutate(
        cards
          .filter((card) => pickedScanIds.has(card.scanId))
          .map((card) => card.scanId),
      ),
  };
}
