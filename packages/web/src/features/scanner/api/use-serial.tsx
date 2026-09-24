import {
  acquireDeviceLease,
  devicesQueryOptions,
  releaseDeviceLease,
  resolveDevice,
  type Device,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import {
  formatCommLog,
  MAX_COMM_LOG_ENTRIES,
  type CommLogEntry,
} from "@/features/scanner/lib/comm-log";
import { flashEsp32Port } from "@/features/scanner/lib/esp32-flasher";
import {
  BluetoothTransport,
  SerialTransport,
  type ByteTransport,
} from "@/features/scanner/lib/transports";
import type {
  FirmwareCheckResult,
  FlashEsp32Result,
  SerialBoardType,
  SerialContextValue,
  SerialMessageListener,
  TestResult,
} from "@/lib/interfaces/scanner";
import { DEVICE_LEASE_HEARTBEAT_MS } from "@/lib/constants/timing";
import type { PreTestHook } from "@/lib/interfaces/stations";
import type { BinRoute } from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export type { SerialMessageListener } from "@/lib/interfaces/scanner";

const SerialContext = createContext<SerialContextValue | null>(null);

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [board, setBoard] = useState<SerialBoardType | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [transport, setTransport] =
    useState<SerialContextValue["transport"]>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<number | null>(null);
  const [flashLog, setFlashLog] = useState<string[]>([]);
  const [leasedDeviceGuid, setLeasedDeviceGuid] = useState<string | null>(null);
  const leasedDeviceGuidRef = useRef<string | null>(null);
  const transportRef = useRef<ByteTransport | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const bufferRef = useRef("");
  const pendingRef = useRef<Array<(line: string) => void>>([]);
  const listenersRef = useRef(new Set<SerialMessageListener>());
  const disconnectingRef = useRef<Promise<void> | null>(null);
  const preTestHooksRef = useRef(new Set<PreTestHook>());
  const commLogRef = useRef<CommLogEntry[]>([]);
  const commLogSnapshotRef = useRef<CommLogEntry[]>([]);
  const commLogListenersRef = useRef(new Set<() => void>());

  const decoderRef = useRef(new TextDecoder());

  const { activeOrg } = useOrg();
  const device = useDevice();
  const deviceRef = useRef(device);
  deviceRef.current = device;
  const { station } = useStation();
  const stationsCtx = useStations();
  const stationsRef = useRef(stationsCtx);
  stationsRef.current = stationsCtx;
  const queryClient = useQueryClient();

  const pushCommLog = useCallback(
    (direction: CommLogEntry["direction"], text: string) => {
      commLogRef.current.push({ direction, text, timestamp: Date.now() });
      if (commLogRef.current.length > MAX_COMM_LOG_ENTRIES) {
        commLogRef.current.shift();
      }
      commLogSnapshotRef.current = [...commLogRef.current];
      for (const listener of commLogListenersRef.current) listener();
    },
    [],
  );

  const getCommLog = useCallback(() => commLogSnapshotRef.current, []);

  const subscribeCommLog = useCallback((listener: () => void) => {
    const listeners = commLogListenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const copyCommLog = useCallback(async () => {
    const entries = getCommLog();
    if (entries.length === 0) {
      toast.error(t("serial.commLogEmpty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(formatCommLog(entries));
      toast.success(t("serial.commLogCopied"));
    } catch {
      toast.error(t("serial.commLogCopyFailed"));
    }
  }, [getCommLog, t]);

  const handleIncomingChunk = useCallback(
    (chunk: Uint8Array) => {
      bufferRef.current += decoderRef.current.decode(chunk, { stream: true });
      const lines = bufferRef.current.split("\n");
      bufferRef.current = lines.pop() || "";
      for (const line of lines) {
        const rawTrimmed = line.trim();
        if (!rawTrimmed) continue;

        const jsonStart = rawTrimmed.search(/[{[]/);
        const trimmed =
          jsonStart > 0 ? rawTrimmed.slice(jsonStart) : rawTrimmed;

        console.log("[Device] ←", trimmed); // eslint-disable-line no-console -- hardware debug trace
        pushCommLog("received", trimmed);

        try {
          const parsed = JSON.parse(trimmed);
          for (const listener of listenersRef.current) {
            listener(parsed);
          }
        } catch {
          console.warn("[Device] Non-JSON message:", trimmed);
        }

        const pending = pendingRef.current.shift();
        if (pending) {
          pending(trimmed);
        }
      }
    },
    [pushCommLog],
  );

  const waitForLine = useCallback((timeoutMs: number): Promise<string> => {
    return new Promise<string>((resolve) => {
      let wrapper: ((line: string) => void) | null = null;

      const timeout = setTimeout(() => {
        if (wrapper) {
          const idx = pendingRef.current.indexOf(wrapper);
          if (idx !== -1) pendingRef.current.splice(idx, 1);
        }
        resolve("");
      }, timeoutMs);

      wrapper = (line: string) => {
        clearTimeout(timeout);
        resolve(line);
      };

      pendingRef.current.push(wrapper);
    });
  }, []);

  const sendCommand = useCallback(
    (data: string): Promise<boolean> => {
      if (!transportRef.current) return Promise.resolve(false);

      return new Promise<boolean>((resolve) => {
        writeQueueRef.current = writeQueueRef.current.then(async () => {
          const activeTransport = transportRef.current;
          if (!activeTransport) {
            resolve(false);
            return;
          }
          try {
            console.log("[Device] →", data.trim()); // eslint-disable-line no-console -- hardware debug trace
            pushCommLog("sent", data.trim());
            await activeTransport.write(new TextEncoder().encode(data));
            resolve(true);
          } catch {
            resolve(false);
          }
        });
      });
    },
    [pushCommLog],
  );

  const sendTest = useCallback(async (): Promise<TestResult> => {
    const sent = await sendCommand(JSON.stringify({ test: true }) + "\n");
    if (!sent) return { ok: false, error: null };

    const response = await waitForLine(10000);
    if (!response) return { ok: false, error: null };

    try {
      const parsed = JSON.parse(response);
      const ok = parsed.status === "test_complete";
      return {
        ok,
        error: !ok && typeof parsed.error === "string" ? parsed.error : null,
      };
    } catch {
      return { ok: false, error: null };
    }
  }, [sendCommand, waitForLine]);

  const disconnect = useCallback(() => {
    const activeTransport = transportRef.current;

    const leased = leasedDeviceGuidRef.current;
    leasedDeviceGuidRef.current = null;
    setLeasedDeviceGuid(null);
    if (leased) void releaseDeviceLease(leased);

    transportRef.current = null;
    writeQueueRef.current = Promise.resolve();
    setIsConnected(false);
    setIsReady(false);
    setFirmwareVersion(null);
    setBoard(null);
    setDeviceId(null);
    setTransport(null);

    for (const pending of pendingRef.current) {
      pending("");
    }
    pendingRef.current = [];
    bufferRef.current = "";

    const cleanup = (async () => {
      if (activeTransport) {
        try {
          await activeTransport.close();
        } catch {}
      }
    })();

    disconnectingRef.current = cleanup.finally(() => {
      disconnectingRef.current = null;
    });

    return cleanup;
  }, []);

  // Shared by the auto-test that normally follows a connect and by callers
  // manually re-triggering it later (e.g. after skipAutoTest) - same
  // toasts/reporting/disconnect-on-fail either way.
  const runConnectTest = useCallback(
    async (forTransport: ByteTransport, forDevice: Device | undefined) => {
      for (const hook of [...preTestHooksRef.current]) {
        try {
          await hook(forDevice);
        } catch (e) {
          console.error("[Serial] Pre-test hook failed:", e); // eslint-disable-line no-console -- hardware debug trace
        }
      }
      if (transportRef.current !== forTransport) return;
      toast.info(t("serial.testingDevice"));
      const { ok, error: testError } = await sendTest();
      if (transportRef.current !== forTransport) return;
      const copyAction = {
        label: t("serial.copyCommunication"),
        onClick: () => copyCommLog(),
      };
      if (ok) {
        toast.success(t("serial.deviceReady"), { action: copyAction });
      } else {
        toast.error(t("serial.deviceTestFailed.title"), {
          description: testError ?? t("serial.deviceTestFailed.description"),
          action: copyAction,
        });
        void reportSerialEvent({
          command: "test",
          sent: true,
          response: null,
        });
        disconnect();
      }
    },
    [sendTest, disconnect, t, copyCommLog],
  );

  // Binds a device record to this station so every calibration read from
  // here on is that physical board's. Returns null when another station in
  // this tab already has the same board open.
  const claimForStation = useCallback(
    (target: Device): Device | null => {
      const { stations, connectedStationIds, bindStationDevice } =
        stationsRef.current;
      const holder = stations.find(
        (s) =>
          s.id !== station.id &&
          s.deviceGuid === target.guid &&
          connectedStationIds.has(s.id),
      );
      if (holder) {
        toast.error(t("serial.deviceInUse.title"), {
          description: t("serial.deviceInUse.description", {
            name: target.name,
          }),
        });
        return null;
      }
      bindStationDevice(station.id, target.guid);
      return target;
    },
    [station.id, t],
  );

  const notifySorterLimit = useCallback(() => {
    toast.error(t("stations.limitReached.title"), {
      description: t("stations.limitReached.description"),
    });
  }, [t]);

  // Fast in-tab check before claiming a device record. The server's lease
  // (acquired after binding, below) is the real enforcement, across every
  // browser and computer in the org.
  const exceedsSorterLimit = useCallback(() => {
    const { stations, connectedStationIds, maxConnectedSorters } =
      stationsRef.current;
    if (maxConnectedSorters === null) return false;
    const otherConnected = stations.filter(
      (s) => s.id !== station.id && connectedStationIds.has(s.id),
    ).length;
    if (otherConnected < maxConnectedSorters) return false;
    notifySorterLimit();
    return true;
  }, [station.id, notifySorterLimit]);

  // Maps the board's firmware id to the org's device record for it, claiming
  // or creating one server-side.
  const bindBoard = useCallback(
    async (hardwareId: string): Promise<Device | undefined | null> => {
      const result = await resolveDevice(hardwareId).catch(() => null);
      if (!result?.success || !result.data) {
        toast.error(t("serial.deviceResolveFailed"));
        return deviceRef.current;
      }
      const resolved = result.data;
      if (activeOrg?.id) {
        queryClient.setQueryData(
          devicesQueryOptions(activeOrg.id).queryKey,
          (old) =>
            old?.some((d) => d.guid === resolved.guid)
              ? old.map((d) => (d.guid === resolved.guid ? resolved : d))
              : [...(old ?? []), resolved],
        );
      }
      return claimForStation(resolved);
    },
    [activeOrg?.id, queryClient, claimForStation, t],
  );

  // Firmware older than the boot-banner `id` can't say which board it is.
  // With only one device on the org there's no ambiguity, so bind to it;
  // otherwise keep whatever this station already shows.
  const bindUnidentifiedBoard = useCallback(async (): Promise<
    Device | undefined | null
  > => {
    if (!activeOrg?.id) return deviceRef.current;
    const devices = await queryClient
      .ensureQueryData(devicesQueryOptions(activeOrg.id))
      .catch(() => []);
    if (devices.length === 1) return claimForStation(devices[0]);
    const current = deviceRef.current;
    toast.warning(t("serial.unidentifiedBoard.title"), {
      description: current
        ? t("serial.unidentifiedBoard.description", { name: current.name })
        : t("serial.unidentifiedBoard.descriptionNoDevice"),
      duration: Infinity,
      dismissible: true,
    });
    return current;
  }, [activeOrg?.id, queryClient, claimForStation, t]);

  const openTransport = useCallback(
    async (
      newTransport: ByteTransport,
      options?: { skipAutoTest?: boolean },
    ): Promise<boolean> => {
      transportRef.current = newTransport;
      newTransport.onData(handleIncomingChunk);
      newTransport.onError(() => {
        toast.error(t("serial.connectionLost.title"), {
          description: t("serial.connectionLost.description"),
        });
        void reportSerialEvent({
          command: "connect",
          sent: false,
          response: null,
        });
      });
      newTransport.onDisconnect(() => {
        if (transportRef.current === newTransport) {
          console.warn("[Device] Connection lost, disconnecting");
          disconnect();
        }
      });
      await newTransport.start();

      setIsConnected(true);
      setTransport(newTransport.kind);

      (async () => {
        // ESP32s reset when the port opens, so the first lines can be ROM
        // bootloader noise rather than JSON - skip ahead to the status line
        // (the boot banner or the getStatus reply, whichever comes first).
        const deadline = Date.now() + 5000;
        const firstLinePromise = waitForLine(5000);
        await sendCommand(JSON.stringify({ getStatus: true }) + "\n");
        let status: Record<string, unknown> | null = null;
        let line = await firstLinePromise;
        while (line) {
          try {
            const parsed = JSON.parse(line);
            if (typeof parsed?.version === "string") status = parsed;
          } catch {}
          const remaining = deadline - Date.now();
          if (status || remaining <= 0) break;
          line = await waitForLine(remaining);
        }
        if (transportRef.current !== newTransport) return;
        if (typeof status?.version === "string") {
          setFirmwareVersion(status.version);
        }
        if (status?.board === "esp32" || status?.board === "uno_r4") {
          setBoard(status.board);
        }
        const hardwareId =
          typeof status?.id === "string" && status.id ? status.id : null;
        if (hardwareId) setDeviceId(hardwareId);
        if (exceedsSorterLimit()) {
          disconnect();
          return;
        }
        const boundDevice = hardwareId
          ? await bindBoard(hardwareId)
          : await bindUnidentifiedBoard();
        if (transportRef.current !== newTransport) return;
        if (boundDevice === null) {
          disconnect();
          return;
        }
        if (boundDevice) {
          const leased = await acquireDeviceLease(boundDevice.guid);
          if (transportRef.current !== newTransport) return;
          if (!leased) {
            notifySorterLimit();
            disconnect();
            return;
          }
          leasedDeviceGuidRef.current = boundDevice.guid;
          setLeasedDeviceGuid(boundDevice.guid);
        }
        if (options?.skipAutoTest) return;
        await runConnectTest(newTransport, boundDevice);
      })();

      return true;
    },
    [
      handleIncomingChunk,
      waitForLine,
      sendCommand,
      exceedsSorterLimit,
      notifySorterLimit,
      bindBoard,
      bindUnidentifiedBoard,
      runConnectTest,
      disconnect,
      t,
    ],
  );

  const runTestOnActiveTransport = useCallback(async () => {
    const activeTransport = transportRef.current;
    if (!activeTransport) return;
    await runConnectTest(activeTransport, deviceRef.current);
  }, [runConnectTest]);

  const connect = useCallback(
    async (options?: { skipAutoTest?: boolean }) => {
      if (disconnectingRef.current) {
        await disconnectingRef.current;
      }
      if (transportRef.current) return;
      if (!navigator.serial) return;

      const result = await SerialTransport.requestAndOpen();
      if (!result.ok) {
        if (result.reason === "cancelled") return;
        toast.error(t("serial.connectionFailed.title"), {
          description: t("serial.connectionFailed.description"),
        });
        void reportSerialEvent({
          command: "connect",
          sent: false,
          response: null,
        });
        return;
      }

      await openTransport(result.transport, options);
    },
    [openTransport, t],
  );

  const connectBluetooth = useCallback(
    async (options?: { skipAutoTest?: boolean }) => {
      if (disconnectingRef.current) {
        await disconnectingRef.current;
      }
      if (transportRef.current) return;
      if (!navigator.bluetooth) return;

      const result = await BluetoothTransport.requestAndConnect();
      if (!result.ok) {
        if (result.reason === "cancelled") return;
        if (result.reason === "permission-blocked") {
          toast.error(t("serial.connectionFailed.title"), {
            description: t("serial.bluetoothPermissionBlocked"),
          });
          void reportSerialEvent({
            command: "connect",
            sent: false,
            response: null,
          });
          return;
        }
        toast.error(t("serial.connectionFailed.title"), {
          description:
            result.message || t("serial.connectionFailed.description"),
        });
        void reportSerialEvent({
          command: "connect",
          sent: false,
          response: null,
        });
        return;
      }

      await openTransport(result.transport, options);
    },
    [openTransport, t],
  );

  // Keeps this sorter's slot against the plan's connected-sorter cap. If the
  // lease was lost (e.g. the server restarted) and another sorter took the
  // slot meanwhile, this one yields.
  useEffect(() => {
    if (!leasedDeviceGuid) return;
    const id = setInterval(() => {
      void acquireDeviceLease(leasedDeviceGuid).then((ok) => {
        if (ok || leasedDeviceGuidRef.current !== leasedDeviceGuid) return;
        notifySorterLimit();
        disconnect();
      });
    }, DEVICE_LEASE_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [leasedDeviceGuid, notifySorterLimit, disconnect]);

  useEffect(
    () =>
      stationsRef.current.registerConnector(station.id, {
        connect: () => connect(),
        connectBluetooth: () => connectBluetooth(),
      }),
    [station.id, connect, connectBluetooth],
  );

  const flashEsp32 = useCallback(
    async (firmwareUrl: string): Promise<FlashEsp32Result> => {
      const activeTransport = transportRef.current;
      if (!activeTransport || activeTransport.kind !== "serial") {
        return { success: false, error: "Not connected via USB." };
      }
      const port = (activeTransport as SerialTransport).port;

      setIsFlashing(true);
      setFlashProgress(0);
      setFlashLog([]);

      try {
        await disconnect();
        return await flashEsp32Port(port, firmwareUrl, {
          onLog: (line) => setFlashLog((prev) => [...prev, line]),
          onClearLog: () => setFlashLog([]),
          onProgress: setFlashProgress,
        });
      } finally {
        setIsFlashing(false);
        setFlashProgress(null);
      }
    },
    [disconnect],
  );

  useEffect(() => {
    if (!navigator.serial) return;
    const handleDisconnect = (event: Event) => {
      const activeTransport = transportRef.current;
      if (
        activeTransport?.kind === "serial" &&
        (activeTransport as SerialTransport).port ===
          (event.target as SerialPort)
      ) {
        console.warn("[Serial] Device unplugged");
        disconnect();
      }
    };
    navigator.serial.addEventListener("disconnect", handleDisconnect);
    return () => {
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
    };
  }, [disconnect]);

  useEffect(() => {
    const listener: SerialMessageListener = (msg) => {
      if (typeof msg !== "object" || msg === null) return;
      const fields = msg as Record<string, unknown>;
      if (fields.status === "test_complete") setIsReady(true);
      // The device announces itself unprompted on boot (ESP32s reset when the
      // port opens) and again on getStatus, so a one-shot waiter can miss it.
      if (typeof fields.version === "string")
        setFirmwareVersion(fields.version);
      if (fields.board === "esp32" || fields.board === "uno_r4") {
        setBoard(fields.board);
      }
      if (typeof fields.id === "string" && fields.id) setDeviceId(fields.id);
    };
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    stationsRef.current.setStationConnected(station.id, isConnected);
  }, [station.id, isConnected]);

  useEffect(() => {
    const stationId = station.id;
    return () => {
      stationsRef.current.setStationConnected(stationId, false);
      void disconnect();
    };
  }, [station.id, disconnect]);

  const subscribe = useCallback((listener: SerialMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const registerPreTestHook = useCallback((fn: PreTestHook) => {
    const hooks = preTestHooksRef.current;
    hooks.add(fn);
    return () => {
      hooks.delete(fn);
    };
  }, []);

  const sendCommandWithNewline = useCallback(
    (data: string) => sendCommand(data + "\n"),
    [sendCommand],
  );

  const receiveResponse = useCallback(
    (timeoutMs = 5000) => waitForLine(timeoutMs),
    [waitForLine],
  );

  const binBusyRef = useRef(false);
  const isRouteBusy = useCallback(() => binBusyRef.current, []);

  const checkFirmwareVersion =
    useCallback(async (): Promise<FirmwareCheckResult> => {
      if (!transportRef.current) return { status: "disconnected" };
      if (binBusyRef.current) return { status: "busy" };

      binBusyRef.current = true;
      try {
        const sent = await sendCommand(
          JSON.stringify({ getStatus: true }) + "\n",
        );
        if (!sent) return { status: "noResponse" };

        const response = await waitForLine(5000);
        if (!response) return { status: "noResponse" };

        try {
          const parsed = JSON.parse(response);
          if (parsed?.board === "esp32" || parsed?.board === "uno_r4") {
            setBoard(parsed.board);
          }
          if (typeof parsed?.version !== "string")
            return { status: "noVersion" };
          setFirmwareVersion(parsed.version);
          return { status: "ok", version: parsed.version };
        } catch {
          return { status: "noVersion" };
        }
      } finally {
        binBusyRef.current = false;
      }
    }, [sendCommand, waitForLine]);

  const sendRoute = useCallback(
    async (route: BinRoute): Promise<unknown | null> => {
      if (!transportRef.current) return null;
      if (binBusyRef.current) return null;

      binBusyRef.current = true;
      try {
        const sent = await sendCommand(
          JSON.stringify({
            route: { module: route.module, direction: route.direction },
          }) + "\n",
        );
        if (!sent) return null;

        const response = await waitForLine(15000);
        if (!response) return null;

        try {
          return JSON.parse(response);
        } catch {
          console.warn("[Device] Non-JSON response:", response);
          return null;
        }
      } finally {
        binBusyRef.current = false;
      }
    },
    [sendCommand, waitForLine],
  );

  return (
    <SerialContext
      value={{
        isConnected,
        isReady,
        firmwareVersion,
        board,
        deviceId,
        transport,
        connect,
        connectBluetooth,
        disconnect,
        sendRoute,
        isRouteBusy,
        sendTest,
        runTest: runTestOnActiveTransport,
        checkFirmwareVersion,
        sendCommand: sendCommandWithNewline,
        receiveResponse,
        subscribe,
        registerPreTestHook,
        getCommLog,
        subscribeCommLog,
        isFlashing,
        flashProgress,
        flashLog,
        flashEsp32,
      }}
    >
      {children}
    </SerialContext>
  );
}

export function useSerial() {
  const context = useContext(SerialContext);
  if (!context) {
    throw new Error("useSerial must be used within a SerialProvider");
  }
  return context;
}

export function useCommLog(): CommLogEntry[] {
  const { getCommLog, subscribeCommLog } = useSerial();
  return useSyncExternalStore(subscribeCommLog, getCommLog);
}

export function useSerialMessage(listener: SerialMessageListener) {
  const { subscribe } = useSerial();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return subscribe((msg) => listenerRef.current(msg));
  }, [subscribe]);
}
