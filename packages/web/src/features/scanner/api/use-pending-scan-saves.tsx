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
import { isRetryableScanSaveError } from "@/features/scanner/lib/scan-save-errors";
import {
  PENDING_SCAN_SAVE_RETRY_DELAYS_MS,
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
  const inFlightRef = useRef(new Set<string>());
  const wakersRef = useRef(new Set<() => void>());
  const stoppedRef = useRef(false);
  const orphansFlushedRef = useRef(false);
  const toastShownRef = useRef(false);

  const waitForRetry = useCallback(
    (attempt: number) =>
      new Promise<void>((resolve) => {
        const wake = () => {
          clearTimeout(timer);
          wakersRef.current.delete(wake);
          resolve();
        };
        const timer = setTimeout(
          wake,
          PENDING_SCAN_SAVE_RETRY_DELAYS_MS[
            Math.min(attempt, PENDING_SCAN_SAVE_RETRY_DELAYS_MS.length - 1)
          ],
        );
        wakersRef.current.add(wake);
      }),
    [],
  );

  useEffect(() => {
    const wakeAll = () => {
      for (const wake of [...wakersRef.current]) wake();
    };
    window.addEventListener("online", wakeAll);
    return () => window.removeEventListener("online", wakeAll);
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
    };
  }, []);

  const retryUntilSettled = useCallback(
    async (
      save: PendingScanSave,
      retryImmediately: boolean,
    ): Promise<CardSaveResult | UnmatchedSaveResult> => {
      inFlightRef.current.add(save.scanId);
      setPendingCount((count) => count + 1);
      try {
        for (let attempt = retryImmediately ? -1 : 0; ; attempt++) {
          if (attempt >= 0) await waitForRetry(attempt);
          if (stoppedRef.current) return new Promise<never>(() => {});
          try {
            const result = await sendPendingSave(save, true);
            await deletePendingScanSave(save.scanId);
            return result;
          } catch (err) {
            if (!isRetryableScanSaveError(err)) {
              await deletePendingScanSave(save.scanId);
              throw err;
            }
            console.warn(`Retrying save of scan ${save.scanId}:`, err);
          }
        }
      } finally {
        inFlightRef.current.delete(save.scanId);
        setPendingCount((count) => count - 1);
      }
    },
    [waitForRetry],
  );

  const submit = useCallback(
    async (
      save: PendingScanSave,
    ): Promise<CardSaveResult | UnmatchedSaveResult> => {
      try {
        return await sendPendingSave(save, false);
      } catch (err) {
        if (!isRetryableScanSaveError(err)) throw err;
        console.warn(`Saving scan ${save.scanId} failed, queued:`, err);
      }
      await putPendingScanSave(save);
      return retryUntilSettled(save, false);
    },
    [retryUntilSettled],
  );

  const saveCard = useCallback(
    (save: CardScanSave) =>
      submit({
        ...save,
        kind: "card",
        scanId: save.record.scanId,
        queuedAt: Date.now(),
      }) as Promise<CardSaveResult>,
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

  const latestRef = useRef({ t, queryClient, retryUntilSettled });
  latestRef.current = { t, queryClient, retryUntilSettled };

  useEffect(() => {
    if (orphansFlushedRef.current) return;
    orphansFlushedRef.current = true;
    void listPendingScanSaves().then((saves) => {
      for (const save of saves) {
        if (inFlightRef.current.has(save.scanId)) continue;
        const { t, queryClient, retryUntilSettled } = latestRef.current;
        retryUntilSettled(save, true)
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
  }, []);

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
