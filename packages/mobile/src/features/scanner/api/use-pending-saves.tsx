import { onlineManager, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { invalidateAfterScanSave } from "@/features/collections/api/collection-cards";
import { unmatchedCardsQueryOptions } from "@/features/collections/api/unmatched-cards";
import { sendScanSave } from "@/features/scanner/api/scan-saves";
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
import { PendingSaveQueue } from "@magic-vault/shared";

const PendingSavesContext = createContext<PendingSavesContextValue | null>(null);

export function PendingSavesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [queue] = useState(
    () =>
      new PendingSaveQueue<PendingScanSave, CardSaveResult>({
        keyOf: (save) => save.key,
        send: sendScanSave,
        put: putPendingSave,
        remove: deletePendingSave,
        onPendingCountChange: (delta) => setPendingCount((count) => count + delta),
      }),
  );

  useEffect(() => {
    queue.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") queue.wakeAll();
    });
    const unsubscribeFromOnlineState = onlineManager.subscribe((isOnline) => {
      if (isOnline) queue.wakeAll();
    });
    return () => {
      queue.stop();
      subscription.remove();
      unsubscribeFromOnlineState();
    };
  }, [queue]);

  const invalidateAfterSave = useCallback(
    (save: PendingScanSave) => {
      invalidateAfterScanSave(queryClient, save.collectionGuid);
      if (save.kind === "unmatched") {
        void queryClient.invalidateQueries({ queryKey: unmatchedCardsQueryOptions(save.collectionGuid).queryKey });
      }
    },
    [queryClient],
  );

  const submit = useCallback(
    async (save: PendingScanSave): Promise<CardSaveResult> => {
      const result = await queue.submit(save);
      invalidateAfterSave(save);
      return result;
    },
    [invalidateAfterSave, queue],
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
      if (queue.isInFlight(save.key)) continue;
      void queue
        .retryUntilSettled(save, true)
        .then(() => invalidateAfterSave(save))
        .catch(() => {});
    }
  }, [invalidateAfterSave, queue]);

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
