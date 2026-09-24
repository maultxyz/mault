import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  ACTIVE_COLLECTION_STORAGE_KEY,
  DEVICE_PREFS_STORAGE_KEY_PREFIX,
} from "@/lib/constants/storage-keys";
import type {
  DevicePrefs,
  StationConnectKind,
  StationConnector,
  StationContextValue,
  StationPanelLayout,
  StationState,
  StationsContextValue,
} from "@/lib/interfaces/stations";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const StationsContext = createContext<StationsContextValue | null>(null);
export const StationContext = createContext<StationContextValue | null>(null);

function newStation(collectionGuid: string | null = null): StationState {
  return {
    id: crypto.randomUUID(),
    deviceGuid: null,
    collectionGuid,
    cameraId: null,
  };
}

function initialStation(): StationState {
  return newStation(localStorage.getItem(ACTIVE_COLLECTION_STORAGE_KEY));
}

function loadDevicePrefs(orgId: string): Record<string, DevicePrefs> {
  try {
    const raw = localStorage.getItem(DEVICE_PREFS_STORAGE_KEY_PREFIX + orgId);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

// Stations track physical connections rather than anything the user manages:
// every connected sorter is a station (shown as a tab), plus exactly one idle
// standby station that the next "connect" goes through. Connecting the
// standby promotes it and spawns a new standby; a sorter disconnecting becomes
// the standby and any other idle station is dropped.
export function StationsProvider({ children }: { children: React.ReactNode }) {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const maxConnectedSorters = Math.min(
    billing?.maxConnectedSorters ?? MAX_CONNECTED_SORTERS,
    MAX_CONNECTED_SORTERS,
  );
  const maxConnectedSortersRef = useRef(maxConnectedSorters);
  maxConnectedSortersRef.current = maxConnectedSorters;
  const [stations, setStationsState] = useState<StationState[]>(() => [
    initialStation(),
  ]);
  const [activeStationId, setActiveStationIdState] = useState(
    () => stations[0].id,
  );
  const [connectedStationIds, setConnectedStationIdsState] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [panelLayout, setPanelLayout] = useState<StationPanelLayout | null>(
    null,
  );
  // Mutators read and write these synchronously so two stations acting within
  // one commit (e.g. both claiming a collection) always see each other.
  const stationsRef = useRef(stations);
  const activeStationIdRef = useRef(activeStationId);
  const connectedRef = useRef(connectedStationIds);
  const devicePrefsRef = useRef<Record<string, DevicePrefs>>({});
  const connectorsRef = useRef(new Map<string, StationConnector>());
  const panelElementsRef = useRef(new Map<string, HTMLElement>());

  const setStations = useCallback((next: StationState[]) => {
    for (const id of panelElementsRef.current.keys()) {
      if (!next.some((s) => s.id === id)) panelElementsRef.current.delete(id);
    }
    stationsRef.current = next;
    setStationsState(next);
  }, []);

  const setActive = useCallback((id: string) => {
    activeStationIdRef.current = id;
    setActiveStationIdState(id);
  }, []);

  const setConnected = useCallback((next: ReadonlySet<string>) => {
    connectedRef.current = next;
    setConnectedStationIdsState(next);
  }, []);

  const isLive = useCallback(
    (id: string) =>
      connectedRef.current.has(id) || activeStationIdRef.current === id,
    [],
  );

  const loadedOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orgId) return;
    devicePrefsRef.current = loadDevicePrefs(orgId);
    const previousOrgId = loadedOrgIdRef.current;
    loadedOrgIdRef.current = orgId;
    if (previousOrgId === null || previousOrgId === orgId) return;
    const fresh = initialStation();
    setConnected(new Set());
    setStations([fresh]);
    setActive(fresh.id);
  }, [orgId, setStations, setActive, setConnected]);

  useEffect(() => {
    if (!orgId) return;
    let changed = false;
    const prefs = { ...devicePrefsRef.current };
    for (const s of stations) {
      if (!s.deviceGuid) continue;
      const existing = prefs[s.deviceGuid];
      if (
        existing?.collectionGuid !== s.collectionGuid ||
        existing?.cameraId !== s.cameraId
      ) {
        prefs[s.deviceGuid] = {
          collectionGuid: s.collectionGuid,
          cameraId: s.cameraId,
        };
        changed = true;
      }
    }
    if (changed) {
      devicePrefsRef.current = prefs;
      localStorage.setItem(
        DEVICE_PREFS_STORAGE_KEY_PREFIX + orgId,
        JSON.stringify(prefs),
      );
    }
    const active = stations.find((s) => s.id === activeStationId);
    if (active?.collectionGuid) {
      localStorage.setItem(ACTIVE_COLLECTION_STORAGE_KEY, active.collectionGuid);
    }
  }, [orgId, stations, activeStationId]);

  const collectionTakenByOther = useCallback(
    (id: string, collectionGuid: string) =>
      stationsRef.current.some(
        (s) =>
          s.id !== id && s.collectionGuid === collectionGuid && isLive(s.id),
      ),
    [isLive],
  );

  const cameraTakenByOther = useCallback(
    (id: string, cameraId: string) =>
      stationsRef.current.some(
        (s) => s.id !== id && s.cameraId === cameraId && isLive(s.id),
      ),
    [isLive],
  );

  const updateStation = useCallback(
    (id: string, patch: Partial<StationState>) => {
      setStations(
        stationsRef.current.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [setStations],
  );

  const setActiveStation = useCallback(
    (id: string) => {
      if (stationsRef.current.some((s) => s.id === id)) setActive(id);
    },
    [setActive],
  );

  const bindStationDevice = useCallback(
    (id: string, deviceGuid: string) => {
      const prefs = devicePrefsRef.current[deviceGuid];
      const restoredCollection =
        prefs?.collectionGuid &&
        !collectionTakenByOther(id, prefs.collectionGuid)
          ? prefs.collectionGuid
          : undefined;
      const restoredCamera =
        prefs?.cameraId && !cameraTakenByOther(id, prefs.cameraId)
          ? prefs.cameraId
          : undefined;
      setStations(
        stationsRef.current.map((s) =>
          s.id === id
            ? {
                ...s,
                deviceGuid,
                ...(restoredCollection
                  ? { collectionGuid: restoredCollection }
                  : {}),
                ...(restoredCamera ? { cameraId: restoredCamera } : {}),
              }
            : s.deviceGuid === deviceGuid
              ? { ...s, deviceGuid: null }
              : s,
        ),
      );
    },
    [collectionTakenByOther, cameraTakenByOther, setStations],
  );

  const claimStationCollection = useCallback(
    (id: string, collectionGuid: string | null) => {
      if (collectionGuid && collectionTakenByOther(id, collectionGuid)) {
        return false;
      }
      updateStation(id, { collectionGuid });
      return true;
    },
    [collectionTakenByOther, updateStation],
  );

  const setStationCamera = useCallback(
    (id: string, cameraId: string | null) => {
      const current = stationsRef.current.find((s) => s.id === id);
      if (current && current.cameraId !== cameraId) {
        updateStation(id, { cameraId });
      }
    },
    [updateStation],
  );

  const setStationConnected = useCallback(
    (id: string, connected: boolean) => {
      if (connectedRef.current.has(id) === connected) return;
      const next = new Set(connectedRef.current);
      if (connected) next.add(id);
      else next.delete(id);
      setConnected(next);
      if (!stationsRef.current.some((s) => s.id === id)) return;

      if (connected) {
        setActive(id);
        // A sorter that was already scanning keeps its collection; the one
        // just connecting falls back to a free one instead.
        const self = stationsRef.current.find((s) => s.id === id);
        if (
          self?.collectionGuid &&
          collectionTakenByOther(id, self.collectionGuid)
        ) {
          updateStation(id, { collectionGuid: null });
        }
        const hasStandby = stationsRef.current.some(
          (s) => s.id !== id && !next.has(s.id),
        );
        if (!hasStandby) setStations([...stationsRef.current, newStation()]);
        return;
      }

      const remaining = stationsRef.current.filter(
        (s) => s.id === id || next.has(s.id),
      );
      setStations(remaining);
      if (activeStationIdRef.current === id) {
        const otherConnected = remaining.find((s) => next.has(s.id));
        if (otherConnected) setActive(otherConnected.id);
      } else if (!remaining.some((s) => s.id === activeStationIdRef.current)) {
        setActive(id);
      }
    },
    [collectionTakenByOther, setActive, setConnected, setStations, updateStation],
  );

  const registerConnector = useCallback(
    (id: string, connector: StationConnector) => {
      connectorsRef.current.set(id, connector);
      return () => {
        if (connectorsRef.current.get(id) === connector) {
          connectorsRef.current.delete(id);
        }
      };
    },
    [],
  );

  // Must stay synchronous up to the connector call: the browser only shows
  // the port/device picker from within the originating user gesture.
  const connectAnotherSorter = useCallback((kind: StationConnectKind) => {
    if (connectedRef.current.size >= maxConnectedSortersRef.current) return;
    const standby = stationsRef.current.find(
      (s) => !connectedRef.current.has(s.id),
    );
    const connector = standby && connectorsRef.current.get(standby.id);
    if (!connector) return;
    void (kind === "usb" ? connector.connect() : connector.connectBluetooth());
  }, []);

  const getPanelElement = useCallback((id: string) => {
    let el = panelElementsRef.current.get(id);
    if (!el) {
      el = document.createElement("div");
      el.style.display = "contents";
      panelElementsRef.current.set(id, el);
    }
    return el;
  }, []);

  const attachPanels = useCallback((layout: StationPanelLayout) => {
    setPanelLayout(layout);
    return () => setPanelLayout(null);
  }, []);

  const value = useMemo<StationsContextValue>(
    () => ({
      stations,
      activeStationId,
      connectedStationIds,
      panelLayout,
      maxConnectedSorters,
      sorterLimitIsHardCap: maxConnectedSorters >= MAX_CONNECTED_SORTERS,
      canConnectAnotherSorter: connectedStationIds.size < maxConnectedSorters,
      isStationLive: (id) =>
        connectedStationIds.has(id) || activeStationId === id,
      setActiveStation,
      bindStationDevice,
      claimStationCollection,
      setStationCamera,
      setStationConnected,
      registerConnector,
      connectAnotherSorter,
      getPanelElement,
      attachPanels,
    }),
    [
      stations,
      activeStationId,
      connectedStationIds,
      panelLayout,
      maxConnectedSorters,
      setActiveStation,
      bindStationDevice,
      claimStationCollection,
      setStationCamera,
      setStationConnected,
      registerConnector,
      connectAnotherSorter,
      getPanelElement,
      attachPanels,
    ],
  );

  return <StationsContext value={value}>{children}</StationsContext>;
}

export function useStations() {
  const context = useContext(StationsContext);
  if (!context) {
    throw new Error("useStations must be used within a StationsProvider");
  }
  return context;
}

export function useStation() {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error("useStation must be used within a StationScope");
  }
  return context;
}
