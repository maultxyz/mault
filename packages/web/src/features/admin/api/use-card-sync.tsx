import {
  cancelSync,
  createSyncEventSource,
  listSyncSources,
  startSync,
} from "@/lib/api/admin";
import { DEFAULT_SYNC_STATE } from "@/lib/constants/admin";
import { LIVE_CLOCK_TICK_MS } from "@/lib/constants/timing";
import type { SyncSourceInfo } from "@/lib/interfaces/admin";
import type { SyncState } from "@magic-vault/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface CardSyncContextValue {
  syncState: SyncState;
  sources: SyncSourceInfo[];
  isRunning: boolean;
  total: number;
  done: number;
  progress: number;
  elapsedMs: number;
  etaMs: number | null;
  start: (gameKey: string, lang: string) => void;
  isStarting: boolean;
  cancel: () => void;
  isCancelling: boolean;
}

const CardSyncContext = createContext<CardSyncContextValue | null>(null);

// Owns the single SSE subscription to the sync job (see lib/sync-job.ts on
// the server) so every admin section that cares about sync status - the
// progress/log panel and the "dump database" guard that disables dumping
// mid-sync - shares one connection and one source of truth instead of each
// opening its own stream.
export function CardSyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [now, setNow] = useState(() => Date.now());

  const sourcesQuery = useQuery({
    queryKey: ["admin", "sync-sources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    async function connect() {
      try {
        es = await createSyncEventSource();
        if (cancelled) {
          es.close();
          return;
        }

        es.addEventListener("status", (e: MessageEvent) => {
          setSyncState(JSON.parse(e.data) as SyncState);
        });

        es.addEventListener("progress", (e: MessageEvent) => {
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("done", (e: MessageEvent) => {
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("log", (e: MessageEvent) => {
          const { line } = JSON.parse(e.data) as { line: string };
          setSyncState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-199), line],
          }));
        });

        es.addEventListener("error", (e: MessageEvent) => {
          if (e.data) {
            const update = JSON.parse(e.data) as { message: string };
            setSyncState((prev) => ({
              ...prev,
              status: "failed",
              logs: [...prev.logs.slice(-199), `Error: ${update.message}`],
            }));
          }
        });
      } catch {}
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  useEffect(() => {
    if (syncState.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), LIVE_CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [syncState.status]);

  const startSyncMutation = useMutation({
    mutationFn: ({ gameKey, lang }: { gameKey: string; lang: string }) =>
      startSync(gameKey, lang),
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
        start: (gameKey, lang) => startSyncMutation.mutate({ gameKey, lang }),
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
