import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { createAppStreamSource } from "@/lib/api/stream";
import { useAuthSession } from "@/lib/auth";
import { DEFAULT_SYNC_STATE } from "@/lib/constants/admin";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { ScanLockInfo, SessionViewer } from "@/lib/interfaces/collections";
import type { SyncState } from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type { ScanLockInfo, SessionViewer };

const GUID_DEBOUNCE_MS = 50;

interface AppStreamContextValue {
  eventSource: EventSource | null;
  locks: Record<string, ScanLockInfo>;
  currentUserId: string | undefined;
  liveCounts: Record<string, number>;
  viewersByGuid: Record<string, SessionViewer[]>;
  syncState: SyncState;
  watchCollection: (guid: string) => () => void;
}

const AppStreamContext = createContext<AppStreamContextValue>({
  eventSource: null,
  locks: {},
  currentUserId: undefined,
  liveCounts: {},
  viewersByGuid: {},
  syncState: DEFAULT_SYNC_STATE,
  watchCollection: () => () => {},
});

export function AppStreamProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useAuthSession();
  const session = sessionData as {
    session?: { activeOrganizationId?: string | null };
    user?: { id?: string };
  } | null;
  const currentUserId = session?.user?.id;
  const orgId =
    session?.session?.activeOrganizationId ??
    localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);

  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [locks, setLocks] = useState<Record<string, ScanLockInfo>>({});
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [viewersByGuid, setViewersByGuid] = useState<
    Record<string, SessionViewer[]>
  >({});
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);

  const refCounts = useRef(new Map<string, number>());
  const [guidsKey, setGuidsKey] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleGuidsUpdate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGuidsKey(Array.from(refCounts.current.keys()).sort().join(","));
    }, GUID_DEBOUNCE_MS);
  }, []);

  const watchCollection = useCallback(
    (guid: string) => {
      refCounts.current.set(guid, (refCounts.current.get(guid) ?? 0) + 1);
      scheduleGuidsUpdate();
      return () => {
        const n = (refCounts.current.get(guid) ?? 1) - 1;
        if (n <= 0) refCounts.current.delete(guid);
        else refCounts.current.set(guid, n);
        scheduleGuidsUpdate();
      };
    },
    [scheduleGuidsUpdate],
  );

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;
    const watchGuids = guidsKey ? guidsKey.split(",") : [];

    createAppStreamSource(orgId, watchGuids)
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }

        es.addEventListener("lock_init", (e) => {
          const { locks: initial } = JSON.parse((e as MessageEvent).data) as {
            locks: Record<string, ScanLockInfo>;
          };
          setLocks(initial);
        });
        es.addEventListener("lock_acquired", (e) => {
          const { guid, userId, displayName } = JSON.parse(
            (e as MessageEvent).data,
          ) as { guid: string; userId: string; displayName: string };
          setLocks((prev) => ({
            ...prev,
            [guid]: {
              userId,
              displayName,
              expiresAt: Date.now() + 5 * 60 * 1000,
            },
          }));
        });
        es.addEventListener("lock_released", (e) => {
          const { guid } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
          };
          setLocks((prev) => {
            const next = { ...prev };
            delete next[guid];
            return next;
          });
        });

        es.addEventListener("live_init", (e) => {
          const { counts, viewers } = JSON.parse((e as MessageEvent).data) as {
            counts: Record<string, number>;
            viewers: Record<string, SessionViewer[]>;
          };
          setLiveCounts(counts);
          setViewersByGuid(viewers);
        });
        es.addEventListener("live_count", (e) => {
          const { guid, count } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
            count: number;
          };
          setLiveCounts((prev) => {
            if (count <= 0) {
              const next = { ...prev };
              delete next[guid];
              return next;
            }
            return { ...prev, [guid]: count };
          });
        });
        es.addEventListener("session_viewers", (e) => {
          const { guid, viewers } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
            viewers: SessionViewer[];
          };
          setViewersByGuid((prev) => {
            if (viewers.length === 0) {
              const next = { ...prev };
              delete next[guid];
              return next;
            }
            return { ...prev, [guid]: viewers };
          });
        });
        es.addEventListener("collections_changed", () => {
          queryClient.invalidateQueries({
            queryKey: collectionsQueryOptions.queryKey,
          });
        });

        es.addEventListener("status", (e) => {
          setSyncState(JSON.parse((e as MessageEvent).data) as SyncState);
        });
        es.addEventListener("progress", (e) => {
          const update = JSON.parse(
            (e as MessageEvent).data,
          ) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });
        es.addEventListener("done", (e) => {
          const update = JSON.parse(
            (e as MessageEvent).data,
          ) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });
        es.addEventListener("log", (e) => {
          const { line } = JSON.parse((e as MessageEvent).data) as {
            line: string;
          };
          setSyncState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-199), line],
          }));
        });

        es.addEventListener("sync_error", (e) => {
          const { message } = JSON.parse((e as MessageEvent).data) as {
            message: string;
          };
          setSyncState((prev) => ({
            ...prev,
            status: "failed",
            logs: [...prev.logs.slice(-199), `Error: ${message}`],
          }));
        });

        setEventSource(es);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      setEventSource((prev) => {
        prev?.close();
        return null;
      });
    };
  }, [orgId, guidsKey, queryClient]);

  const value = useMemo<AppStreamContextValue>(
    () => ({
      eventSource,
      locks,
      currentUserId,
      liveCounts,
      viewersByGuid,
      syncState,
      watchCollection,
    }),
    [
      eventSource,
      locks,
      currentUserId,
      liveCounts,
      viewersByGuid,
      syncState,
      watchCollection,
    ],
  );

  return <AppStreamContext value={value}>{children}</AppStreamContext>;
}

export function useCollectionLocks() {
  const { locks, currentUserId } = useContext(AppStreamContext);
  return {
    locks,
    currentUserId,
    isLockedByOther: (guid: string) => {
      const lock = locks[guid];
      return !!(lock && lock.userId !== currentUserId);
    },
  };
}

export function useLiveSessionCounts(): Record<string, number> {
  return useContext(AppStreamContext).liveCounts;
}

export function useSessionViewersByGuid(): Record<string, SessionViewer[]> {
  return useContext(AppStreamContext).viewersByGuid;
}

export function useSyncState(): SyncState {
  return useContext(AppStreamContext).syncState;
}

export function useCollectionStream(
  guid: string | undefined,
): EventSource | null {
  const { eventSource, watchCollection } = useContext(AppStreamContext);

  useEffect(() => {
    if (!guid) return;
    return watchCollection(guid);
  }, [guid, watchCollection]);

  return guid ? eventSource : null;
}
