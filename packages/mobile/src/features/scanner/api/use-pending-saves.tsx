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
import { AppState } from "react-native";
import { invalidateAfterScanSave } from "@/features/collections/api/collection-cards";
import { isRetryableSaveError, sendScanSave } from "@/features/scanner/api/scan-saves";
import {
  deletePendingSave,
  listPendingSaves,
  putPendingSave,
} from "@/features/scanner/lib/pending-store";
import type {
  CardSaveResult,
  PendingSavesContextValue,
  PendingScanSave,
} from "@/lib/interfaces/scanner";
import { pendingScanSaveRetryDelayMs } from "@magic-vault/shared";

const PendingSavesContext = createContext<PendingSavesContextValue | null>(null);

export function PendingSavesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const inFlight = useRef(new Set<string>());
  const wakers = useRef(new Set<() => void>());
  const stopped = useRef(false);

  const waitForRetry = useCallback(
    (attempt: number) =>
      new Promise<void>((resolve) => {
        const wake = () => {
          clearTimeout(timer);
          wakers.current.delete(wake);
          resolve();
        };
        const timer = setTimeout(wake, pendingScanSaveRetryDelayMs(attempt));
        wakers.current.add(wake);
      }),
    [],
  );

  useEffect(() => {
    stopped.current = false;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      for (const wake of [...wakers.current]) wake();
    });
    return () => {
      stopped.current = true;
      subscription.remove();
    };
  }, []);

  const retryUntilSettled = useCallback(
    async (save: PendingScanSave, retryImmediately: boolean): Promise<CardSaveResult> => {
      inFlight.current.add(save.key);
      setPendingCount((count) => count + 1);
      try {
        for (let attempt = retryImmediately ? -1 : 0; ; attempt++) {
          if (attempt >= 0) await waitForRetry(attempt);
          if (stopped.current) return new Promise<never>(() => {});
          try {
            const result = await sendScanSave(save, true);
            deletePendingSave(save.key);
            return result;
          } catch (err) {
            if (!isRetryableSaveError(err)) {
              deletePendingSave(save.key);
              throw err;
            }
          }
        }
      } finally {
        inFlight.current.delete(save.key);
        setPendingCount((count) => count - 1);
      }
    },
    [waitForRetry],
  );

  const submit = useCallback(
    async (save: PendingScanSave): Promise<CardSaveResult> => {
      try {
        const result = await sendScanSave(save, false);
        invalidateAfterScanSave(queryClient, save.collectionGuid);
        return result;
      } catch (err) {
        if (!isRetryableSaveError(err)) throw err;
      }
      putPendingSave(save);
      return retryUntilSettled(save, false);
    },
    [queryClient, retryUntilSettled],
  );

  const saveCard = useCallback<PendingSavesContextValue["saveCard"]>(
    (save) => submit({ ...save, kind: "card", key: save.record.scanId, attempts: 0 }),
    [submit],
  );

  const saveUnmatched = useCallback<PendingSavesContextValue["saveUnmatched"]>(
    (save) => submit({ ...save, kind: "unmatched", key: save.record.scanId, attempts: 0 }),
    [submit],
  );

  useEffect(() => {
    for (const save of listPendingSaves()) {
      if (inFlight.current.has(save.key)) continue;
      void retryUntilSettled(save, true)
        .then(() => invalidateAfterScanSave(queryClient, save.collectionGuid))
        .catch(() => {});
    }
  }, [queryClient, retryUntilSettled]);

  const value = useMemo(
    () => ({ pendingCount, saveCard, saveUnmatched }),
    [pendingCount, saveCard, saveUnmatched],
  );

  return <PendingSavesContext.Provider value={value}>{children}</PendingSavesContext.Provider>;
}

export function usePendingSaves(): PendingSavesContextValue {
  const context = useContext(PendingSavesContext);
  if (!context) throw new Error("usePendingSaves must be used inside PendingSavesProvider");
  return context;
}
