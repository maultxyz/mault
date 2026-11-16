import { pendingScanCardsStore } from "@/features/cards/lib/pending-scan-cards-store";
import {
  addCollectionCard,
  addUnmatchedCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import {
  deletePendingScanSave,
  listPendingScanSaves,
  putPendingScanSave,
} from "@/features/scanner/lib/pending-scan-store";
import {
  PENDING_SCAN_SAVES_TOAST_ID,
} from "@/lib/constants/scanner";
import { TOAST_DURATION_MS } from "@/lib/constants/toast";
import type {
  CardSaveResult,
  CardScanSave,
  PendingScanSave,
  PendingScanSavesContextValue,
  UnmatchedSaveResult,
  UnmatchedScanSave,
} from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { PendingSaveQueue } from "@magic-vault/shared";

const PendingScanSavesContext =
  createContext<PendingScanSavesContextValue | null>(null);

function sendPendingSave(
  save: PendingScanSave,
  isRetry: boolean,
): Promise<CardSaveResult | UnmatchedSaveResult> {
  const options = { deviceGuid: save.deviceGuid, orgId: save.orgId, isRetry };
  return save.kind === "card"
    ? addCollectionCard(save.collectionGuid, save.record, options)
    : addUnmatchedCard(save.collectionGuid, save.record, options);
}

export function PendingScanSavesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const orphansFlushedRef = useRef(false);
  const toastShownRef = useRef(false);
  const [queue] = useState(
    () =>
      new PendingSaveQueue<PendingScanSave, CardSaveResult | UnmatchedSaveResult>(
        {
          keyOf: (save) => save.scanId,
          send: sendPendingSave,
          put: putPendingScanSave,
          remove: deletePendingScanSave,
          onPendingCountChange: (delta) =>
            setPendingCount((count) => count + delta),
          onRetryableFailure: (save, error, wasQueued) =>
            console.warn(
              wasQueued
                ? `Retrying save of scan ${save.scanId}:`
                : `Saving scan ${save.scanId} failed, queued:`,
              error,
            ),
        },
      ),
  );

  useEffect(() => {
    const wakeAll = () => queue.wakeAll();
    window.addEventListener("online", wakeAll);
    return () => window.removeEventListener("online", wakeAll);
  }, [queue]);

  useEffect(() => {
    queue.start();
    return () => queue.stop();
  }, [queue]);

  const submit = useCallback(
    (save: PendingScanSave) => queue.submit(save),
    [queue],
  );

  const saveCard = useCallback(
    async (save: CardScanSave) => {
      const { scanId, card } = save.record;
      pendingScanCardsStore.add({
        scanId,
        collectionGuid: save.collectionGuid,
        card,
      });
      try {
        const result = (await submit({
          ...save,
          kind: "card",
          scanId,
          queuedAt: Date.now(),
        })) as CardSaveResult;
        if (result.success) pendingScanCardsStore.markSaved(scanId);
        else pendingScanCardsStore.remove(scanId);
        return result;
      } catch (err) {
        pendingScanCardsStore.remove(scanId);
        throw err;
      }
    },
    [submit],
  );

  const saveUnmatched = useCallback(
    (save: UnmatchedScanSave) =>
      submit({
        ...save,
        kind: "unmatched",
        scanId: save.record.scanId,
        queuedAt: Date.now(),
      }) as Promise<UnmatchedSaveResult>,
    [submit],
  );

  const latestRef = useRef({ t, queryClient });
  latestRef.current = { t, queryClient };

  useEffect(() => {
    if (orphansFlushedRef.current) return;
    orphansFlushedRef.current = true;
    void listPendingScanSaves().then((saves) => {
      for (const save of saves) {
        if (queue.isInFlight(save.scanId)) continue;
        const { t, queryClient } = latestRef.current;
        queue
          .retryUntilSettled(save, true)
          .then((result) => {
            if (result.success) {
              void invalidateCollectionCards(queryClient, save.collectionGuid);
              return;
            }
            toast.error(t("pendingScanSaves.rejected.title"), {
              description: result.message,
            });
          })
          .catch((err) => {
            console.error("Failed to save queued scan:", err);
            toast.error(t("pendingScanSaves.rejected.title"), {
              description: t("pendingScanSaves.rejected.description"),
            });
          });
      }
    });
  }, [queue]);

  useEffect(() => {
    if (pendingCount > 0) {
      toastShownRef.current = true;
      toast.loading(t("pendingScanSaves.saving.title", { count: pendingCount }), {
        id: PENDING_SCAN_SAVES_TOAST_ID,
        description: t("pendingScanSaves.saving.description"),
        duration: Infinity,
      });
    } else if (toastShownRef.current) {
      toastShownRef.current = false;
      toast.success(t("pendingScanSaves.saved.title"), {
        id: PENDING_SCAN_SAVES_TOAST_ID,
        description: undefined,
        duration: TOAST_DURATION_MS,
      });
    }
  }, [pendingCount, t]);

  const value = useMemo(
    () => ({ saveCard, saveUnmatched, pendingCount }),
    [saveCard, saveUnmatched, pendingCount],
  );

  return (
    <PendingScanSavesContext value={value}>{children}</PendingScanSavesContext>
  );
}

export function usePendingScanSaves(): PendingScanSavesContextValue {
  const ctx = useContext(PendingScanSavesContext);
  if (!ctx) {
    throw new Error(
      "usePendingScanSaves must be used within PendingScanSavesProvider",
    );
  }
  return ctx;
}
