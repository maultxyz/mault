import { useBrowserVectorize } from "@/features/admin/api/use-browser-vectorize";
import { cancelSync, listSyncSources, startSync } from "@/lib/api/admin";
import { useSyncState } from "@/lib/app-stream";
import { browserSyncParallel } from "@/lib/constants/admin";
import { LIVE_CLOCK_TICK_MS } from "@/lib/constants/timing";
import type { CardSyncContextValue } from "@/lib/interfaces/admin";
import type { SyncVectorizeOn } from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const CardSyncContext = createContext<CardSyncContextValue | null>(null);

export function CardSyncProvider({ children }: { children: ReactNode }) {
  const syncState = useSyncState();
  const [now, setNow] = useState(() => Date.now());

  const sourcesQuery = useQuery({
    queryKey: ["admin", "sync-sources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (syncState.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), LIVE_CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [syncState.status]);

  const startSyncMutation = useMutation({
    mutationFn: ({
      gameKey,
      lang,
      forceResync,
      concurrency,
      vectorizeOn,
    }: {
      gameKey: string;
      lang: string;
      forceResync?: boolean;
      concurrency?: number;
      vectorizeOn?: SyncVectorizeOn;
    }) => startSync(gameKey, lang, forceResync, concurrency, vectorizeOn),
  });
  const cancelSyncMutation = useMutation({ mutationFn: cancelSync });

  const catalogTotal = syncState.total;
  const catalogDone = syncState.processed + syncState.skipped;
  const browserJob = syncState.vectorizeOn === "browser";
  const isRunning = syncState.status === "running";
  const pace = useBrowserVectorize(
    isRunning && browserJob,
    syncState.acceptingWork,
    syncState.processed,
    browserSyncParallel(syncState.concurrency),
  );
  const newTotal = Math.max(0, catalogTotal - syncState.skipped);
  const finishedNew = browserJob
    ? pace.vectorized + syncState.errors
    : catalogDone;
  const total = browserJob ? newTotal : catalogTotal;
  const done = browserJob ? finishedNew : catalogDone;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const elapsedMs = syncState.startedAt
    ? now - new Date(syncState.startedAt).getTime()
    : 0;
  const workStartedRef = useRef<number | null>(null);
  if (!isRunning) workStartedRef.current = null;
  else if (
    browserJob &&
    syncState.acceptingWork &&
    workStartedRef.current === null
  ) {
    workStartedRef.current = Date.now();
  }
  const browserElapsedMs = workStartedRef.current
    ? now - workStartedRef.current
    : 0;
  const rateBaseline = useRef<number | null>(null);
  if (!isRunning) rateBaseline.current = null;
  else if (
    browserJob &&
    syncState.acceptingWork &&
    rateBaseline.current === null
  ) {
    rateBaseline.current = syncState.processed;
  }
  const gained = Math.max(
    0,
    pace.vectorized - (rateBaseline.current ?? pace.vectorized),
  );
  const cardsPerMinute =
    browserJob && browserElapsedMs >= 5_000 && gained > 0
      ? Math.round((gained / browserElapsedMs) * 60_000)
      : null;
  const etaMs = browserJob
    ? gained > 0 && newTotal > finishedNew
      ? (browserElapsedMs / gained) * (newTotal - finishedNew)
      : null
    : catalogDone > 0 && catalogTotal > catalogDone
      ? (elapsedMs / catalogDone) * (catalogTotal - catalogDone)
      : null;

  return (
    <CardSyncContext
      value={{
        syncState,
        sources: sourcesQuery.data ?? [],
        isRunning,
        total,
        done,
        progress,
        elapsedMs,
        etaMs,
        cardsPerMinute,
        embeddingCount: pace.embeddingCount,
        start: (gameKey, lang, forceResync, concurrency, vectorizeOn) =>
          startSyncMutation.mutate({
            gameKey,
            lang,
            forceResync,
            concurrency,
            vectorizeOn,
          }),
        isStarting: startSyncMutation.isPending,
        cancel: () => cancelSyncMutation.mutate(),
        isCancelling: cancelSyncMutation.isPending,
      }}
    >
      {children}
    </CardSyncContext>
  );
}

export function useCardSync() {
  const context = useContext(CardSyncContext);
  if (!context) {
    throw new Error("useCardSync must be used within a CardSyncProvider");
  }
  return context;
}
