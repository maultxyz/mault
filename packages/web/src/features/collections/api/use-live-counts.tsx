import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { createLiveCountEventsSource } from "@/lib/api/session";
import { useAuthSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface SessionViewer {
  userId: string;
  displayName: string;
}

interface LiveSessionStatusContextValue {
  counts: Record<string, number>;
  viewersByGuid: Record<string, SessionViewer[]>;
}

const LiveSessionStatusContext = createContext<LiveSessionStatusContextValue>({
  counts: {},
  viewersByGuid: {},
});

export function LiveSessionStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [viewersByGuid, setViewersByGuid] = useState<
    Record<string, SessionViewer[]>
  >({});
  const queryClient = useQueryClient();
  const { data: sessionData } = useAuthSession();
  const session = sessionData as {
    session?: { activeOrganizationId?: string | null };
  } | null;
  const orgId =
    session?.session?.activeOrganizationId ??
    localStorage.getItem("activeOrgId");

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    createLiveCountEventsSource()
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }
        esRef.current = es;

        es.addEventListener("init", (e) => {
          const { counts: initialCounts, viewers: initialViewers } =
            JSON.parse((e as MessageEvent).data) as {
              counts: Record<string, number>;
              viewers: Record<string, SessionViewer[]>;
            };
          setCounts(initialCounts);
          setViewersByGuid(initialViewers);
        });

        es.addEventListener("live_count", (e) => {
          const { guid, count } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
            count: number;
          };
          setCounts((prev) => {
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
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [orgId, queryClient]);

  return (
    <LiveSessionStatusContext value={{ counts, viewersByGuid }}>
      {children}
    </LiveSessionStatusContext>
  );
}

export function useLiveSessionCounts(): Record<string, number> {
  return useContext(LiveSessionStatusContext).counts;
}

export function useSessionViewersByGuid(): Record<string, SessionViewer[]> {
  return useContext(LiveSessionStatusContext).viewersByGuid;
}
