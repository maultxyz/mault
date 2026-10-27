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
import {
  CHANNEL_OFFSET,
  type CommLogEntry,
  DEFAULT_CHANNEL_LAYOUT,
  DEVICE_LEASE_HEARTBEAT_MS,
  JAM_CLEAR_DEVICE_TIMEOUT_MS,
  JAM_COMMAND_TIMEOUT_MS,
  NUS_SERVICE_UUID,
  isFirmwareFeatureSupported,
  isServoDriverMissing,
  SELF_TEST_RESPONSE_TIMEOUT_MS,
  SERIAL_HEARTBEAT_INTERVAL_MS,
  SERIAL_HEARTBEAT_TIMEOUT_MS,
  SERIAL_IDENTIFY_ATTEMPT_TIMEOUT_MS,
  SERIAL_IDENTIFY_TIMEOUT_MS,
  type SerialReply,
  statusResetReason,
  statusUptimeMs,
  SERIAL_HEARTBEAT_MAX_MISSES,
  SERIAL_IDENTIFY_ATTEMPTS,
  type BinRoute,
  type RouteOptions,
  STORE_CONFIG_TIMEOUT_MS,
} from "@magic-vault/shared";
import {
  acquireDeviceLease,
  fetchFeederConfig,
  fetchModuleConfigs,
  releaseDeviceLease,
  resolveDevice,
} from "@/features/devices/api/devices";
import { State } from "react-native-ble-plx";
import { ensureBlePermissions } from "@/features/sorter/lib/ble-permissions";
import { BleTransport, getBleManager, settledBleState } from "@/features/sorter/lib/ble-transport";
import { CloudTransport } from "@/features/sorter/lib/cloud-transport";
import { SorterLink } from "@/features/sorter/lib/sorter-link";
import { useActiveOrgId } from "@/hooks/use-org";
import {
  BLE_DISCOVERY_TIMEOUT_MS,
  AUTO_CONNECT_LAUNCH_DELAY_MS,
  AUTO_RECONNECT_ATTEMPTS,
  AUTO_RECONNECT_INTERVAL_MS,
  CLOUD_SORTER_ID_PREFIX,
} from "@/lib/constants/sorter";
import { LAST_SORTER_ID_KEY, SORTER_AUTO_CONNECT_KEY } from "@/lib/constants/storage-keys";
import type { Device } from "@/lib/interfaces/devices";
import type {
  ByteTransport,
  CloudOpenResult,
  DiscoveredSorter,
  SorterContextValue,
  SorterError,
  SensorNote,
  SorterNotice,
  SorterPhase,
  SorterStatusReply,
  TestOutcome,
} from "@/lib/interfaces/sorter";
import { readKv, writeKv } from "@/lib/storage/kv";
import { useSession } from "@/lib/auth/session";

const SorterContext = createContext<SorterContextValue | null>(null);

const link = new SorterLink();

async function openTransport(id: string): Promise<CloudOpenResult> {
  if (id.startsWith(CLOUD_SORTER_ID_PREFIX)) {
    return CloudTransport.open(id.slice(CLOUD_SORTER_ID_PREFIX.length));
  }
  return { ok: true, transport: await BleTransport.connect(id) };
}

function parseTest(reply: SerialReply | null): TestOutcome {
  if (!reply) return { ok: false, error: null, blockedModule: null, servoDriverMissing: false };
  const ok = reply.status === "test_complete";
  return {
    ok,
    error: !ok && typeof reply.error === "string" ? reply.error : null,
    blockedModule: !ok && typeof reply.module === "number" ? reply.module : null,
    servoDriverMissing: !ok && isServoDriverMissing(reply),
  };
}

export function SorterProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [phase, setPhase] = useState<SorterPhase>("idle");
  const [error, setError] = useState<SorterError | null>(null);
  const [notice, setNotice] = useState<SorterNotice | null>(null);
  const [sensorNote, setSensorNote] = useState<SensorNote | null>(null);
  const [clearingSensor, setClearingSensor] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredSorter[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [board, setBoard] = useState<string | null>(null);
  const [commLog, setCommLog] = useState<CommLogEntry[]>([]);
  const deviceRef = useRef<Device | null>(null);
  const uptimeRef = useRef<number | null>(null);
  const discoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const versionRef = useRef<string | null>(null);
  const resyncingRef = useRef(false);
  const recoverRef = useRef<(status: unknown) => void>(() => {});
  const connectRef = useRef<(id: string) => Promise<void>>(async () => {});
  const manualDisconnectRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const launchedRef = useRef(false);
  const { status: sessionStatus } = useSession();

  useEffect(() => link.subscribeCommLog(() => setCommLog(link.getCommLog())), []);

  const stopDiscovery = useCallback(() => {
    if (discoveryTimerRef.current) clearTimeout(discoveryTimerRef.current);
    discoveryTimerRef.current = null;
    void getBleManager().stopDeviceScan();
    setPhase((current) => (current === "scanning" ? "idle" : current));
  }, []);

  const fail = useCallback((next: SorterError) => {
    console.warn("[Sorter] failed", JSON.stringify(next));
    setError(next);
    setPhase("error");
  }, []);

  const teardown = useCallback(async () => {
    attemptRef.current += 1;
    link.onBootBanner = null;
    const transport = link.detach();
    const leased = deviceRef.current;
    deviceRef.current = null;
    uptimeRef.current = null;
    versionRef.current = null;
    setDevice(null);
    setFirmwareVersion(null);
    setBoard(null);
    if (leased) void releaseDeviceLease(leased.guid);
    await transport?.close();
  }, []);

  const disconnect = useCallback(async () => {
    await teardown();
    setError(null);
    setNotice(null);
    setSensorNote(null);
    setPhase("idle");
  }, [teardown]);

  const disconnectByUser = useCallback(async () => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    await disconnect();
  }, [disconnect]);

  const scheduleReconnect = useCallback((id: string, attempt: number) => {
    if (manualDisconnectRef.current || attempt > AUTO_RECONNECT_ATTEMPTS) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      if (manualDisconnectRef.current || deviceRef.current) return;
      void connectRef.current(id).then(() => {
        if (!deviceRef.current && !manualDisconnectRef.current) scheduleReconnect(id, attempt + 1);
      });
    }, AUTO_RECONNECT_INTERVAL_MS);
  }, []);

  const startDiscovery = useCallback(() => {
    const ble = getBleManager();
    setError(null);
    setDiscovered([]);
    void ensureBlePermissions()
      .then((granted) => (granted ? settledBleState() : State.Unauthorized))
      .then((state) => {
        if (state === State.Unauthorized) {
          fail({ code: "bluetooth-unauthorized" });
          return;
        }
        if (state !== State.PoweredOn && state !== State.Unknown) {
          fail({ code: "bluetooth-off" });
          return;
        }
        setPhase("scanning");
        void ble.startDeviceScan([NUS_SERVICE_UUID], null, async (scanError, found) => {
          if (scanError) {
            stopDiscovery();
            fail({ code: "connect-failed", detail: scanError.message });
            return;
          }
          if (!found) return;
          setDiscovered((current) => {
            const entry = { id: found.id, name: found.localName ?? found.name ?? null, rssi: found.rssi ?? null };
            const without = current.filter((d) => d.id !== found.id);
            return [...without, entry].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
          });
        });
        discoveryTimerRef.current = setTimeout(stopDiscovery, BLE_DISCOVERY_TIMEOUT_MS);
      });
  }, [fail, stopDiscovery]);

  const identify = useCallback(async (): Promise<SorterStatusReply | null> => {
    const deadline = Date.now() + SERIAL_IDENTIFY_TIMEOUT_MS;
    for (let attempt = 0; attempt < SERIAL_IDENTIFY_ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const reply = await link.sendParsed(
        { getStatus: true },
        Math.min(remaining, SERIAL_IDENTIFY_ATTEMPT_TIMEOUT_MS),
      );
      if (reply && typeof reply.version === "string") return reply as SorterStatusReply;
    }
    return null;
  }, []);

  const syncCalibration = useCallback(async (target: Device, version: string | null) => {
    const channelOffset = CHANNEL_OFFSET[target.channelLayout ?? DEFAULT_CHANNEL_LAYOUT];
    await link.sendParsed({ setChannelOffset: channelOffset });
    const [modules, feeder] = await Promise.all([
      fetchModuleConfigs(target.guid),
      fetchFeederConfig(target.guid),
    ]);
    for (const config of modules) {
      await link.sendParsed({ setConfig: { module: config.moduleNumber, ...config.calibration } });
    }
    await link.sendParsed({ setFeederConfig: feeder });
    if (isFirmwareFeatureSupported(version, "storedCalibration")) {
      await link.sendParsed({ storeConfig: true }, STORE_CONFIG_TIMEOUT_MS);
    }
  }, []);

  const runSelfTest = useCallback(async (): Promise<boolean> => {
    setSensorNote(null);
    setPhase("testing");
    const outcome = parseTest(await link.sendParsed({ test: true }, SELF_TEST_RESPONSE_TIMEOUT_MS));
    if (outcome.ok) {
      setError(null);
      setPhase("ready");
      return true;
    }
    if (outcome.blockedModule !== null) {
      fail({ code: "sensor-blocked", module: outcome.blockedModule });
    } else if (outcome.servoDriverMissing) {
      fail({ code: "servo-driver-missing" });
    } else {
      fail({ code: "test-failed", detail: outcome.error ?? undefined });
    }
    return false;
  }, [fail]);

  const connect = useCallback(
    async (id: string) => {
      stopDiscovery();
      manualDisconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      await teardown();
      const attempt = attemptRef.current;
      const stale = () => attemptRef.current !== attempt;
      setError(null);
      setNotice(null);
      setSensorNote(null);
      setPhase("connecting");

      let transport: ByteTransport;
      try {
        const opened = await openTransport(id);
        if (!opened.ok) {
          if (!stale()) fail({ code: opened.code });
          return;
        }
        transport = opened.transport;
      } catch (err) {
        if (!stale()) fail({ code: "connect-failed", detail: err instanceof Error ? err.message : undefined });
        return;
      }
      if (stale()) {
        await transport.close();
        return;
      }
      link.clearCommLog();
      link.attach(transport);
      transport.onDisconnect(() => {
        console.warn("[Sorter] transport disconnected", JSON.stringify({ stale: stale() }));
        if (stale()) return;
        const autoConnect = !!deviceRef.current?.autoConnect;
        void teardown();
        fail({ code: "connection-lost" });
        if (autoConnect) scheduleReconnect(id, 1);
      });
      try {
        await transport.start();
        writeKv(LAST_SORTER_ID_KEY, id);

        setPhase("identifying");
        const status = await identify();
        if (stale()) return;
        if (!status?.id) {
          await teardown();
          fail({ code: "identify-failed" });
          return;
        }
        if (typeof status.bleMtu === "number") transport.setMtu(status.bleMtu);
        setFirmwareVersion(status.version ?? null);
        versionRef.current = status.version ?? null;
        setBoard(status.board ?? null);
        uptimeRef.current = statusUptimeMs(status);

        let bound: Device;
        try {
          bound = await resolveDevice(status.id);
        } catch {
          if (stale()) return;
          await teardown();
          fail({ code: "identify-failed" });
          return;
        }
        if (stale()) return;
        if (!(await acquireDeviceLease(bound.guid))) {
          await teardown();
          fail({ code: "sorter-limit" });
          return;
        }
        if (stale()) {
          void releaseDeviceLease(bound.guid);
          return;
        }
        deviceRef.current = bound;
        setDevice(bound);
        writeKv(SORTER_AUTO_CONNECT_KEY, bound.autoConnect ? "1" : null);
        void queryClient.invalidateQueries({ queryKey: ["devices"] });

        link.onBootBanner = (banner) => {
          if (!link.hasTaggedReplies) return false;
          if (!stale()) recoverRef.current(banner);
          return true;
        };

        setPhase("syncing");
        await syncCalibration(bound, status.version ?? null);
        if (stale()) return;
        if (!bound.setupCompletedAt) {
          fail({ code: "setup-incomplete" });
          return;
        }

        if (bound.testOnConnect) {
          await runSelfTest();
          return;
        }
        const check = await link.sendParsed({ getStatus: true });
        if (stale()) return;
        if (isServoDriverMissing(check)) {
          fail({ code: "servo-driver-missing" });
          return;
        }
        await link.sendNeutral();
        if (stale()) return;
        setPhase("ready");
      } catch (err) {
        if (stale()) return;
        console.warn("[Sorter] bring-up failed", err);
        await teardown();
        fail({ code: "connect-failed", detail: err instanceof Error ? err.message : undefined });
      }
    },
    [fail, identify, queryClient, runSelfTest, scheduleReconnect, stopDiscovery, syncCalibration, teardown],
  );
  connectRef.current = connect;

  const connectCloud = useCallback(
    (deviceGuid: string) => connect(`${CLOUD_SORTER_ID_PREFIX}${deviceGuid}`),
    [connect],
  );

  useEffect(() => {
    if (sessionStatus !== "signed-in" || launchedRef.current) return;
    launchedRef.current = true;
    const id = readKv(LAST_SORTER_ID_KEY);
    if (!id || readKv(SORTER_AUTO_CONNECT_KEY) !== "1") return;
    const timer = setTimeout(() => {
      const permitted = id.startsWith(CLOUD_SORTER_ID_PREFIX) ? Promise.resolve(true) : ensureBlePermissions();
      void permitted.then((granted) => {
        if (granted && !deviceRef.current && !manualDisconnectRef.current) void connectRef.current(id);
      });
    }, AUTO_CONNECT_LAUNCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sessionStatus]);

  useEffect(
    () => () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (phase !== "ready") return;
    let misses = 0;
    let checking = false;
    const interval = setInterval(async () => {
      if (checking || link.isBusy() || !link.transport) return;
      checking = true;
      try {
        const sentAt = Date.now();
        const reply = await link.sendParsed({ getStatus: true }, SERIAL_HEARTBEAT_TIMEOUT_MS);
        if (!reply) {
          misses += 1;
          console.warn("[Sorter] heartbeat missed", JSON.stringify({ misses, waitedMs: Date.now() - sentAt }));
          if (misses >= SERIAL_HEARTBEAT_MAX_MISSES) {
            await teardown();
            fail({ code: "heartbeat-lost" });
          }
          return;
        }
        misses = 0;
        const uptime = statusUptimeMs(reply);
        const previous = uptimeRef.current;
        uptimeRef.current = uptime;
        if (uptime !== null && previous !== null && uptime < previous) {
          recoverRef.current(reply);
        }
      } finally {
        checking = false;
      }
    }, SERIAL_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, fail, teardown]);

  const recoverFromReset = useCallback(
    async (status: unknown) => {
      const bound = deviceRef.current;
      console.warn("[Sorter] restart detected", JSON.stringify(status));
      if (!bound || !link.transport || resyncingRef.current) return;
      resyncingRef.current = true;
      const attempt = attemptRef.current;
      const stale = () => attemptRef.current !== attempt;
      link.failPendingReplies();
      uptimeRef.current = statusUptimeMs(status);
      const bannerVersion = (status as SorterStatusReply | null)?.version;
      if (typeof bannerVersion === "string") versionRef.current = bannerVersion;
      setNotice({ reason: statusResetReason(status) ?? "unknown" });
      setError(null);
      setPhase("syncing");
      try {
        await syncCalibration(bound, versionRef.current);
        if (stale()) return;
        if (bound.testOnConnect) {
          await runSelfTest();
          return;
        }
        const check = await link.sendParsed({ getStatus: true });
        if (stale()) return;
        if (!check) {
          fail({ code: "connection-lost", detail: "reset" });
          return;
        }
        uptimeRef.current = statusUptimeMs(check) ?? uptimeRef.current;
        if (isServoDriverMissing(check)) {
          fail({ code: "servo-driver-missing" });
          return;
        }
        await link.sendNeutral();
        if (stale()) return;
        setPhase("ready");
      } catch {
        if (!stale()) fail({ code: "connection-lost", detail: "reset" });
      } finally {
        resyncingRef.current = false;
      }
    },
    [fail, runSelfTest, syncCalibration],
  );
  recoverRef.current = (status) => void recoverFromReset(status);

  useEffect(() => {
    if (!device) return;
    const interval = setInterval(() => {
      void acquireDeviceLease(device.guid);
    }, DEVICE_LEASE_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [device]);

  useEffect(() => {
    void disconnect();
  }, [orgId, disconnect]);

  useEffect(
    () => () => {
      void teardown();
    },
    [teardown],
  );

  const sendRequest = useCallback(
    (command: object, timeoutMs?: number) => link.sendRequest(command, timeoutMs),
    [],
  );
  const sendRoute = useCallback(
    (route: BinRoute, options?: RouteOptions) => link.sendRoute(route, options),
    [],
  );
  const feed = useCallback(() => link.feed(), []);
  const sendNeutral = useCallback(() => link.sendNeutral(), []);
  const clearDevice = useCallback(async () => {
    await link.sendCommand({ clearDevice: true });
  }, []);
  const sendCommand = useCallback((command: object) => {
    void link.sendCommand(command);
  }, []);
  const updateDevice = useCallback((next: Device) => {
    if (deviceRef.current?.guid !== next.guid) return;
    deviceRef.current = next;
    setDevice(next);
    writeKv(SORTER_AUTO_CONNECT_KEY, next.autoConnect ? "1" : null);
  }, []);
  const applySavedCalibration = useCallback(async () => {
    const bound = deviceRef.current;
    if (!bound || !link.transport) return;
    await syncCalibration(bound, versionRef.current);
  }, [syncCalibration]);
  const subscribe = useCallback<SorterContextValue["subscribe"]>(
    (listener) => link.subscribe(listener),
    [],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  const dropBlockedCard = useCallback(async () => {
    if (clearingSensor) return;
    setClearingSensor(true);
    try {
      const reply = await link.sendParsed({ clearDevice: true }, JAM_CLEAR_DEVICE_TIMEOUT_MS);
      setSensorNote(!reply || reply.error ? "dropFailed" : "dropped");
    } finally {
      setClearingSensor(false);
    }
  }, [clearingSensor]);

  const markSensorCleared = useCallback(async () => {
    if (clearingSensor) return;
    setClearingSensor(true);
    try {
      const reply = await link.sendParsed({ readIR: true }, JAM_COMMAND_TIMEOUT_MS);
      const ir = reply?.ir;
      if (!Array.isArray(ir)) {
        setSensorNote("noResponse");
        return;
      }
      const blocked = ir.indexOf(true);
      if (blocked !== -1) {
        fail({ code: "sensor-blocked", module: blocked + 1 });
        setSensorNote("stillBlocked");
        return;
      }
      await runSelfTest();
    } finally {
      setClearingSensor(false);
    }
  }, [clearingSensor, fail, runSelfTest]);

  const value = useMemo<SorterContextValue>(
    () => ({
      phase,
      error,
      notice,
      dismissNotice,
      sensorNote,
      clearingSensor,
      dropBlockedCard,
      markSensorCleared,
      discovered,
      device,
      firmwareVersion,
      board,
      isReady: phase === "ready",
      isConnected: !!device,
      commLog,
      startDiscovery,
      stopDiscovery,
      connect,
      connectCloud,
      disconnect: disconnectByUser,
      runSelfTest,
      sendRequest,
      sendRoute,
      feed,
      sendNeutral,
      clearDevice,
      sendCommand,
      applySavedCalibration,
      updateDevice,
      subscribe,
    }),
    [
      phase,
      error,
      notice,
      dismissNotice,
      sensorNote,
      clearingSensor,
      dropBlockedCard,
      markSensorCleared,
      discovered,
      device,
      firmwareVersion,
      board,
      commLog,
      startDiscovery,
      stopDiscovery,
      connect,
      connectCloud,
      disconnectByUser,
      runSelfTest,
      sendRequest,
      sendRoute,
      feed,
      sendNeutral,
      clearDevice,
      sendCommand,
      applySavedCalibration,
      updateDevice,
      subscribe,
    ],
  );

  return <SorterContext.Provider value={value}>{children}</SorterContext.Provider>;
}

export function useSorter(): SorterContextValue {
  const context = useContext(SorterContext);
  if (!context) throw new Error("useSorter must be used inside SorterProvider");
  return context;
}

export function useSorterMessage(listener: (message: unknown) => void): void {
  const { subscribe } = useSorter();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => subscribe((message) => listenerRef.current(message)), [subscribe]);
}
