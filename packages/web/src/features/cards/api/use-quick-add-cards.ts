import {
  addManualCollectionCard,
  removeCollectionCards,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { storageLocationKeys } from "@/features/storage/api/storage-locations";
import type {
  QuickAddLogEntry,
  QuickAddLogEntryStatus,
  QuickAddRequest,
} from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import { generateScanId } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export function useQuickAddCards() {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<QuickAddLogEntry[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const updateEntry = useCallback(
    (
      entryId: string,
      changes: Partial<Pick<QuickAddLogEntry, "isFoil" | "scanIds">> & {
        status: QuickAddLogEntryStatus;
      },
    ) =>
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, ...changes } : entry,
        ),
      ),
    [],
  );

  const refreshCardLists = useCallback(
    (collectionGuid: string, locationGuid: string | undefined) => {
      void invalidateCollectionCards(queryClient, collectionGuid);
      if (locationGuid) {
        void queryClient.invalidateQueries({
          queryKey: storageLocationKeys.root(),
        });
      }
    },
    [queryClient],
  );

  const addCards = useCallback(
    async (request: QuickAddRequest) => {
      const entryId = generateScanId();
      setEntries((current) => [
        { ...request, id: entryId, status: "saving", scanIds: [] },
        ...current,
      ]);
      const result = await addManualCollectionCard(request.collectionGuid, {
        card: request.card,
        locationGuid: request.locationGuid,
        quantity: request.quantity,
        isFoil: request.isFoil,
        condition: request.condition,
      }).catch(() => null);
      if (!result?.success || !result.data) {
        updateEntry(entryId, { status: "failed" });
        toast.error(result?.message ?? t("addCard.failed"));
        setAnnouncement(
          t("quickAdd.failedAnnouncement", { name: request.card.name }),
        );
        return;
      }
      updateEntry(entryId, {
        status: "added",
        isFoil: result.data.isFoil === true,
        scanIds: result.addedScanIds ?? [result.data.scanId],
      });
      setAnnouncement(
        t("quickAdd.addedAnnouncement", {
          count: request.quantity,
          name: request.card.name,
        }),
      );
      refreshCardLists(request.collectionGuid, request.locationGuid);
    },
    [refreshCardLists, t, updateEntry],
  );

  const undoEntry = useCallback(
    async (entry: QuickAddLogEntry) => {
      updateEntry(entry.id, { status: "undoing" });
      const result = await removeCollectionCards(
        entry.collectionGuid,
        entry.scanIds,
      ).catch(() => null);
      if (!result?.success) {
        updateEntry(entry.id, { status: "added" });
        toast.error(t("quickAdd.undoFailed"));
        return;
      }
      updateEntry(entry.id, { status: "undone" });
      setAnnouncement(
        t("quickAdd.undoneAnnouncement", { name: entry.card.name }),
      );
      refreshCardLists(entry.collectionGuid, entry.locationGuid);
    },
    [refreshCardLists, t, updateEntry],
  );

  return { entries, announcement, addCards, undoEntry };
}
