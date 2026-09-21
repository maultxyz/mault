import { cancelSync, listSyncSources, startSync } from "@/lib/api/admin";
import { useSyncState } from "@/lib/app-stream";
import { LIVE_CLOCK_TICK_MS } from "@/lib/constants/timing";
import type { SyncSourceInfo } from "@/lib/interfaces/admin";
import type { SyncState } from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CardSyncContextValue {
  syncState: SyncState;
  sources: SyncSourceInfo[];
  isRunning: boolean;
  total: number;
  done: number;
  progress: number;
  elapsedMs: number;
  etaMs: number | null;
  start: (gameKey: string, lang: string, forceResync?: boolean) => void;
  isStarting: boolean;
  cancel: () => void;
  isCancelling: boolean;
}

const CardSyncContext = createContext<CardSyncContextValue | null>(null);

// Sync status is one of several concerns multiplexed over the single
// app-wide SSE connection (see lib/app-stream.tsx) so every admin section
// that cares about it - the progress/log panel and the "dump database" guard
// that disables dumping mid-sync - shares one source of truth instead of
// each opening its own stream.
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
    }: {
      gameKey: string;
      lang: string;
      forceResync?: boolean;
    }) => startSync(gameKey, lang, forceResync),
  });
  const cancelSyncMutation = useMutation({ mutationFn: cancelSync });

  const total = syncState.total;
  const done = syncState.processed + syncState.skipped;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const elapsedMs = syncState.startedAt
    ? now - new Date(syncState.startedAt).getTime()
    : 0;
  const etaMs =
    done > 0 && total > done ? (elapsedMs / done) * (total - done) : null;
  const isRunning = syncState.status === "running";

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
        start: (gameKey, lang, forceResync) =>
          startSyncMutation.mutate({ gameKey, lang, forceResync }),
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
