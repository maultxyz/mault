import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import EventSource from "react-native-sse";
import { DEPLOY_STATUS_EVENT, type DeployNotice } from "@magic-vault/shared";
import { getRequestAuth } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/config";
import { STREAM_RECONNECT_DELAY_MS } from "@/lib/constants/monitor";
import { SCAN_LOCK_TTL_MS } from "@/lib/constants/stream";
import type { AppStreamValue, ScanLockInfo } from "@/lib/interfaces/stream";

const AppStreamContext = createContext<AppStreamValue>({ locks: {}, liveCounts: {}, deployNotice: null });

function parse<T>(data: string | null | undefined): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function AppStreamProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { status, activeOrgId } = useSession();
  const [locks, setLocks] = useState<Record<string, ScanLockInfo>>({});
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [deployNotice, setDeployNotice] = useState<DeployNotice | null>(null);

  useEffect(() => {
    setLocks({});
    setLiveCounts({});
    setDeployNotice(null);
    if (status !== "signed-in" || !activeOrgId) return;
    let source: EventSource<string> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = async () => {
      const { token } = await getRequestAuth();
      if (cancelled) return;
      const params = new URLSearchParams({ orgId: activeOrgId });
      if (token) params.set("token", token);
      const es = new EventSource<string>(`${API_BASE}/api/stream?${params.toString()}`, { pollingInterval: 0 });
      source = es;
      const on = (name: string, handler: (data: string | null) => void) =>
        es.addEventListener(name, (event) => handler((event as { data: string | null }).data));

      on("lock_init", (data) => setLocks(parse<{ locks: Record<string, ScanLockInfo> }>(data)?.locks ?? {}));
      on("lock_acquired", (data) => {
        const lock = parse<{ guid: string; userId: string; displayName: string }>(data);
        if (!lock) return;
        setLocks((prev) => ({
          ...prev,
          [lock.guid]: { userId: lock.userId, displayName: lock.displayName, expiresAt: Date.now() + SCAN_LOCK_TTL_MS },
        }));
      });
      on("lock_released", (data) => {
        const lock = parse<{ guid: string }>(data);
        if (lock) setLocks((prev) => without(prev, lock.guid));
      });
      on("live_init", (data) => setLiveCounts(parse<{ counts: Record<string, number> }>(data)?.counts ?? {}));
      on("live_count", (data) => {
        const live = parse<{ guid: string; count: number }>(data);
        if (!live) return;
        setLiveCounts((prev) => (live.count <= 0 ? without(prev, live.guid) : { ...prev, [live.guid]: live.count }));
      });
      on("collections_changed", () => void queryClient.invalidateQueries({ queryKey: ["collections"] }));
      on(DEPLOY_STATUS_EVENT, (data) => setDeployNotice(parse<DeployNotice | null>(data)));
      es.addEventListener("error", () => {
        es.close();
        if (cancelled) return;
        reconnectTimer = setTimeout(() => void connect(), STREAM_RECONNECT_DELAY_MS);
      });
    };

    void connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.removeAllEventListeners();
      source?.close();
    };
  }, [status, activeOrgId, queryClient]);

  const value = useMemo(() => ({ locks, liveCounts, deployNotice }), [locks, liveCounts, deployNotice]);
  return <AppStreamContext.Provider value={value}>{children}</AppStreamContext.Provider>;
}

export function useAppStream(): AppStreamValue {
  return useContext(AppStreamContext);
}
