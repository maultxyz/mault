import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import {
  DEPLOY_STATUS_EVENT,
  MACHINES_INIT_EVENT,
  MACHINE_REMOVED_EVENT,
  MACHINE_STATUS_EVENT,
  removeMachineStatusFromList,
  sortMachinesForDisplay,
  upsertMachineStatus,
  type MachineStatus,
  ORDERS_CHANGED_EVENT,
  PICK_LIST_CHANGED_EVENT,
  TRADE_OFFERS_CHANGED_EVENT,
  type DeployNotice,
} from "@magic-vault/shared";
import { BUSINESS_ORDERS_QUERY_KEY } from "@/lib/constants/business";
import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { getRequestAuth } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/config";
import { STREAM_RECONNECT_DELAY_MS } from "@/lib/constants/monitor";
import { SCAN_LOCK_TTL_MS, STREAM_BACKGROUND_RECONNECT_MS } from "@/lib/constants/stream";
import type { ScanLockInfo } from "@/lib/interfaces/stream";

const ScanLocksContext = createContext<Record<string, ScanLockInfo>>({});
const DeployNoticeContext = createContext<DeployNotice | null>(null);
const MachineStatusesContext = createContext<MachineStatus[]>([]);

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
  const [deployNotice, setDeployNotice] = useState<DeployNotice | null>(null);
  const [machines, setMachines] = useState<MachineStatus[]>([]);

  useEffect(() => {
    setLocks({});
    setDeployNotice(null);
    setMachines([]);
    if (status !== "signed-in" || !activeOrgId) return;
    let source: EventSource<string> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let hasOpenedBefore = false;
    let connectAttempt = 0;
    let backgroundedAt: number | null = null;

    const refreshAfterReconnect = () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: BUSINESS_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    };

    const connect = async () => {
      const attempt = ++connectAttempt;
      const { token } = await getRequestAuth();
      if (cancelled || attempt !== connectAttempt) return;
      const params = new URLSearchParams({ orgId: activeOrgId });
      if (token) params.set("token", token);
      const es = new EventSource<string>(`${API_BASE}/api/stream?${params.toString()}`, { pollingInterval: 0 });
      source = es;
      const on = (name: string, handler: (data: string | null) => void) =>
        es.addEventListener(name, (event) => handler((event as { data: string | null }).data));

      es.addEventListener("open", () => {
        if (hasOpenedBefore) refreshAfterReconnect();
        hasOpenedBefore = true;
      });

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
      on("collections_changed", () => void queryClient.invalidateQueries({ queryKey: ["collections"] }));
      on(ORDERS_CHANGED_EVENT, () => void queryClient.invalidateQueries({ queryKey: BUSINESS_ORDERS_QUERY_KEY }));
      on(PICK_LIST_CHANGED_EVENT, () => void queryClient.invalidateQueries({ queryKey: ["bin-sets", activeOrgId] }));
      on(TRADE_OFFERS_CHANGED_EVENT, () => void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] }));
      on(DEPLOY_STATUS_EVENT, (data) => setDeployNotice(parse<DeployNotice | null>(data)));
      on(MACHINES_INIT_EVENT, (data) =>
        setMachines(sortMachinesForDisplay(parse<{ machines: MachineStatus[] }>(data)?.machines ?? [])),
      );
      on(MACHINE_STATUS_EVENT, (data) => {
        const status = parse<MachineStatus>(data);
        if (status) setMachines((prev) => upsertMachineStatus(prev, status));
      });
      on(MACHINE_REMOVED_EVENT, (data) => {
        const removed = parse<{ machineId: string }>(data);
        if (removed) setMachines((prev) => removeMachineStatusFromList(prev, removed.machineId));
      });
      es.addEventListener("error", () => {
        if (source !== es) return;
        es.close();
        if (cancelled) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => void connect(), STREAM_RECONNECT_DELAY_MS);
      });
    };

    const closeSource = () => {
      const current = source;
      source = null;
      current?.removeAllEventListeners();
      current?.close();
    };

    const appStateSubscription = AppState.addEventListener("change", (appState) => {
      if (appState !== "active") {
        backgroundedAt ??= Date.now();
        return;
      }
      const wasBackgroundedAt = backgroundedAt;
      backgroundedAt = null;
      if (wasBackgroundedAt === null || Date.now() - wasBackgroundedAt < STREAM_BACKGROUND_RECONNECT_MS) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      closeSource();
      void connect();
    });

    void connect();
    return () => {
      cancelled = true;
      appStateSubscription.remove();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      closeSource();
    };
  }, [status, activeOrgId, queryClient]);

  return (
    <ScanLocksContext.Provider value={locks}>
      <DeployNoticeContext.Provider value={deployNotice}>
        <MachineStatusesContext.Provider value={machines}>{children}</MachineStatusesContext.Provider>
      </DeployNoticeContext.Provider>
    </ScanLocksContext.Provider>
  );
}

export function useScanLocks(): Record<string, ScanLockInfo> {
  return useContext(ScanLocksContext);
}

export function useDeployNotice(): DeployNotice | null {
  return useContext(DeployNoticeContext);
}

export function useMachineStatuses(): MachineStatus[] {
  return useContext(MachineStatusesContext);
}
