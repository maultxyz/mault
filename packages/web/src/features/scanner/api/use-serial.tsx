import {
  acquireDeviceLease,
  devicesQueryOptions,
  releaseDeviceLease,
  resolveDevice,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  reportSerialEvent,
} from "@/features/notifications/api/notification-settings";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { formatCommLog } from "@/features/scanner/lib/comm-log";
import { rememberBleDevice } from "@/features/scanner/lib/ble-device-map";
import { flashEsp32Port } from "@/features/scanner/lib/esp32-flasher";
import { claimBootNotice } from "@/features/scanner/lib/sorter-boot-notice";
import { showSorterLimitToast } from "@/features/scanner/lib/sorter-limit-toast";
import { JamToastBody } from "@/features/scanner/components/jam-toast-body";
import { sorterLinkClientUrl } from "@/features/scanner/lib/sorter-link";
import {
  BluetoothTransport,
  CloudTransport,
  SerialTransport,
} from "@/features/scanner/lib/transports";
import {
  JAM_CLEAR_DEVICE_TIMEOUT_MS,
  JAM_COMMAND_TIMEOUT_MS,
  SENSOR_BLOCKED_TOAST_ID,
} from "@/lib/constants/scanner";
import {
  DEVICE_LEASE_HEARTBEAT_MS,
  NEUTRAL_RESPONSE_TIMEOUT_MS,
  PUSH_TEST_RESPONSE_TIMEOUT_MS,
  ROUTE_RESPONSE_TIMEOUT_MS,
  ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS,
  SELF_TEST_RESPONSE_TIMEOUT_MS,
  SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
  SERIAL_HEARTBEAT_INTERVAL_MS,
  SERIAL_HEARTBEAT_TIMEOUT_MS,
  SERIAL_IDENTIFY_ATTEMPT_TIMEOUT_MS,
  SERIAL_IDENTIFY_TIMEOUT_MS,
  SERIAL_RECOVERY_SKIP_TEST_MS,
} from "@/lib/constants/timing";
import type {
  ConnectTestRunner,
  FirmwareCheckResult,
  FlashEsp32Result,
  PendingSerialReply,
  PushTest,
  RawCommandResult,
  RouteOptions,
  SerialBoardType,
  SerialContextValue,
  SerialMessageListener,
  SerialRecoveryMark,
  SerialRequestResult,
  SkippedRouteResponse,
  TestResult,
  ByteTransport,
  CommLogEntry,
} from "@/lib/interfaces/scanner";
import type { BleReconnectState, PreTestHook } from "@/lib/interfaces/stations";
import {
  BLE_RECONNECT_BASE_DELAY_MS,
  BLE_RECONNECT_MAX_DELAY_MS,
  SERIAL_ABNORMAL_RESET_REASONS,
  SERIAL_HEARTBEAT_MAX_MISSES,
  SERIAL_IDENTIFY_ATTEMPTS,
  SERIAL_PUSH_BLOCKED_ERROR,
  SERIAL_SEQ_MAX,
  isBootBanner,
  isBusyResponse,
  isFailedRouteResponse,
  isServoDriverMissing,
  isUnsolicitedSerialMessage,
  replySeq,
  statusResetReason,
  statusUptimeMs,
  withSeq,
  type BinRoute,
} from "@magic-vault/shared";
import { IconCopy } from "@tabler/icons-react";
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
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { Device } from "@/lib/interfaces/calibration";
import { MAX_COMM_LOG_ENTRIES } from "@/lib/constants/limits";


const SerialContext = createContext<SerialContextValue | null>(null);

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sensorBlockedModule, setSensorBlockedModule] = useState<
    number | null
  >(null);
  const reopenSensorBlockedToastRef = useRef<(() => void) | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [board, setBoard] = useState<SerialBoardType | null>(null);
  const [hasWifi, setHasWifi] = useState(false);
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
  const pendingRef = useRef<PendingSerialReply[]>([]);
  const seqRef = useRef(Math.floor(Math.random() * SERIAL_SEQ_MAX));
  const taggedRepliesRef = useRef(false);
  const resetWatchArmedRef = useRef(false);
  const lastUptimeMsRef = useRef<number | null>(null);
  const recoveryMarkRef = useRef<SerialRecoveryMark | null>(null);
  const handleUnexpectedResetRef = useRef<(status: unknown) => void>(
    () => {},
  );
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
  }, [toast, getCommLog, t]);

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

        pushCommLog("received", trimmed);

        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          console.warn("[Device] Non-JSON message:", trimmed);
          continue;
        }
        for (const listener of listenersRef.current) {
          listener(parsed);
        }
        if (isBootBanner(parsed) && resetWatchArmedRef.current) {
          handleUnexpectedResetRef.current(parsed);
          continue;
        }
        if (isUnsolicitedSerialMessage(parsed)) continue;

        const seq = replySeq(parsed);
        if (seq !== null) {
          taggedRepliesRef.current = true;
          const index = pendingRef.current.findIndex((p) => p.seq === seq);
          if (index !== -1) {
            pendingRef.current.splice(index, 1)[0].resolve(trimmed);
          }
          continue;
        }
        if (taggedRepliesRef.current) continue;

        const pending =
          isBusyResponse(parsed) && pendingRef.current.length > 1
            ? pendingRef.current.splice(1, 1)[0]
            : pendingRef.current.shift();
        pending?.resolve(trimmed);
      }
    },
    [pushCommLog],
  );

  const nextSeq = useCallback(() => {
    seqRef.current = seqRef.current >= SERIAL_SEQ_MAX ? 1 : seqRef.current + 1;
    return seqRef.current;
  }, []);

  const writeLine = useCallback(
    (text: string): Promise<boolean> => {
      if (!transportRef.current) return Promise.resolve(false);

      return new Promise<boolean>((resolve) => {
        writeQueueRef.current = writeQueueRef.current.then(async () => {
          const activeTransport = transportRef.current;
          if (!activeTransport) {
            resolve(false);
            return;
          }
          try {
            pushCommLog("sent", text.trim());
            await activeTransport.write(new TextEncoder().encode(text));
            resolve(true);
          } catch {
            resolve(false);
          }
        });
      });
    },
    [pushCommLog],
  );

  const sendCommand = useCallback(
    (data: string): Promise<boolean> =>
      writeLine(withSeq(data, nextSeq()).text),
    [writeLine, nextSeq],
  );

  const requestLine = useCallback(
    (data: string, timeoutMs: number): Promise<SerialRequestResult> => {
      if (!transportRef.current) {
        return Promise.resolve({ sent: false, line: "" });
      }
      const { text, seq } = withSeq(data, nextSeq());
      return new Promise<SerialRequestResult>((resolve) => {
        const removeEntry = () => {
          const index = pendingRef.current.indexOf(entry);
          if (index !== -1) pendingRef.current.splice(index, 1);
        };
        const timeout = setTimeout(() => {
          removeEntry();
          resolve({ sent: true, line: "" });
        }, timeoutMs);
        const entry: PendingSerialReply = {
          seq,
          resolve: (line) => {
            clearTimeout(timeout);
            resolve({ sent: true, line });
          },
        };
        pendingRef.current.push(entry);
        void writeLine(text).then((sent) => {
          if (sent) return;
          clearTimeout(timeout);
          removeEntry();
          resolve({ sent: false, line: "" });
        });
      });
    },
    [writeLine, nextSeq],
  );

  const sendRequest = useCallback(
    (
      command: object,
      timeoutMs = SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
    ): Promise<SerialRequestResult> =>
      requestLine(JSON.stringify(command), timeoutMs),
    [requestLine],
  );

  const clearSensorBlocked = useCallback(() => {
    reopenSensorBlockedToastRef.current = null;
    setSensorBlockedModule(null);
    toast.dismiss(SENSOR_BLOCKED_TOAST_ID);
  }, [toast, ]);

  const sendTest = useCallback(async (): Promise<TestResult> => {
    setIsReady(false);
    clearSensorBlocked();
    const { sent, line: response } = await sendRequest(
      { test: true },
      SELF_TEST_RESPONSE_TIMEOUT_MS,
    );
    const failed: TestResult = {
      ok: false,
      error: null,
      blockedModule: null,
      servoDriverMissing: false,
    };
    if (!sent || !response) return failed;

    try {
      const parsed = JSON.parse(response);
      const ok = parsed.status === "test_complete";
      return {
        ok,
        error: !ok && typeof parsed.error === "string" ? parsed.error : null,
        blockedModule:
          !ok && typeof parsed.module === "number" ? parsed.module : null,
        servoDriverMissing: !ok && isServoDriverMissing(parsed),
      };
    } catch {
      return failed;
    }
  }, [sendRequest, clearSensorBlocked]);

  const runConnectTestRef = useRef<ConnectTestRunner | null>(null);

  const showSensorBlockedToast = useCallback(
    (
      module: number,
      forTransport: ByteTransport,
      forDevice: Device | undefined,
    ) => {
      let busy = false;

      const runCommand = async (command: object, timeoutMs: number) => {
        if (transportRef.current !== forTransport) return null;
        const { line } = await sendRequest(command, timeoutMs);
        if (!line) return null;
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      };

      const runExclusive = async (task: () => Promise<void>) => {
        if (busy) return;
        busy = true;
        try {
          await task();
        } finally {
          busy = false;
        }
      };

      const handleDrop = () =>
        runExclusive(async () => {
          const response = await runCommand(
            { clearDevice: true },
            JAM_CLEAR_DEVICE_TIMEOUT_MS,
          );
          show(
            !response || response.error
              ? t("cardScanner.jamDetected.dropFailed")
              : t("serial.sensorBlocked.dropped"),
          );
        });

      const handleMarkCleared = () =>
        runExclusive(async () => {
          const response = await runCommand(
            { readIR: true },
            JAM_COMMAND_TIMEOUT_MS,
          );
          if (!Array.isArray(response?.ir)) {
            show(t("serial.sensorBlocked.noResponse"));
            return;
          }
          const blockedIndex = response.ir.indexOf(true);
          if (blockedIndex !== -1) {
            setSensorBlockedModule(blockedIndex + 1);
            show(
              t("serial.sensorBlocked.stillBlocked", {
                module: blockedIndex + 1,
              }),
            );
            return;
          }
          clearSensorBlocked();
          await runConnectTestRef.current?.(forTransport, forDevice);
        });

      function show(description: string) {
        reopenSensorBlockedToastRef.current = () => show(description);
        toast.error(t("serial.sensorBlocked.title"), {
          id: SENSOR_BLOCKED_TOAST_ID,
          description: (
            <JamToastBody
              description={description}
              dropLabel={t("cardScanner.jamDetected.dropCard")}
              markClearedLabel={t("cardScanner.jamDetected.markCleared")}
              onDrop={() => void handleDrop()}
              onMarkCleared={() => void handleMarkCleared()}
            />
          ),
          duration: Infinity,
          dismissible: true,
        });
      }

      setSensorBlockedModule(module);
      show(t("serial.sensorBlocked.description", { module }));
    },
    [toast, sendRequest, clearSensorBlocked, t],
  );

  const disconnect = useCallback(() => {
    const activeTransport = transportRef.current;
    if (activeTransport) pushCommLog("disconnected", activeTransport.kind);

    const leased = leasedDeviceGuidRef.current;
    leasedDeviceGuidRef.current = null;
    setLeasedDeviceGuid(null);
    if (leased) void releaseDeviceLease(leased);

    transportRef.current = null;
    stationsRef.current.releaseHardware(station.id);
    writeQueueRef.current = Promise.resolve();
    setIsConnected(false);
    setIsReady(false);
    clearSensorBlocked();
    setFirmwareVersion(null);
    setBoard(null);
    setHasWifi(false);
    setDeviceId(null);
    setTransport(null);

    for (const pending of pendingRef.current) {
      pending.resolve("");
    }
    pendingRef.current = [];
    taggedRepliesRef.current = false;
    resetWatchArmedRef.current = false;
    lastUptimeMsRef.current = null;
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
  }, [station.id, clearSensorBlocked, pushCommLog]);

  const runPreTestHooks = useCallback(async (forDevice: Device | undefined) => {
    for (const hook of [...preTestHooksRef.current]) {
      try {
        await hook(forDevice);
      } catch (e) {
        console.error("[Serial] Pre-test hook failed:", e);
      }
    }
  }, []);

  const syncWithoutTest = useCallback(
    async (forTransport: ByteTransport, forDevice: Device | undefined) => {
      await runPreTestHooks(forDevice);
      if (transportRef.current !== forTransport) return;
      const { line } = await sendRequest({ getStatus: true });
      if (transportRef.current !== forTransport) return;
      let status: unknown = null;
      try {
        status = JSON.parse(line);
      } catch {}
      if (isServoDriverMissing(status)) {
        toast.error(t("serial.servoDriverMissing.title"), {
          description: t("serial.servoDriverMissing.description"),
        });
        disconnect();
        return;
      }
      await sendRequest({ neutral: true }, NEUTRAL_RESPONSE_TIMEOUT_MS);
      if (transportRef.current !== forTransport) return;
      setIsReady(true);
      toast.success(t("serial.deviceReadyNoTest"));
    },
    [toast, runPreTestHooks, sendRequest, disconnect, t],
  );

  const runConnectTest = useCallback(
    async (forTransport: ByteTransport, forDevice: Device | undefined) => {
      await runPreTestHooks(forDevice);
      if (transportRef.current !== forTransport) return;
      toast.info(t("serial.testingDevice"));
      const {
        ok,
        error: testError,
        blockedModule,
        servoDriverMissing,
      } = await sendTest();
      if (transportRef.current !== forTransport) return;
      const copyAction = {
        label: (
          <IconCopy size={14} aria-label={t("serial.copyCommunication")} />
        ),
        onClick: () => copyCommLog(),
      };
      if (ok) {
        toast.dismiss(SENSOR_BLOCKED_TOAST_ID);
        toast.success(t("serial.deviceReady"), {
          cancel: copyAction,
          action: {
            label: t("serial.dropCard"),
            onClick: () =>
              void sendCommand(JSON.stringify({ clearDevice: true })),
          },
        });
      } else if (blockedModule !== null) {
        showSensorBlockedToast(blockedModule, forTransport, forDevice);
      } else if (servoDriverMissing) {
        toast.error(t("serial.servoDriverMissing.title"), {
          description: t("serial.servoDriverMissing.description"),
          action: copyAction,
        });
        disconnect();
      } else {
        toast.error(t("serial.deviceTestFailed.title"), {
          description: testError ?? t("serial.deviceTestFailed.description"),
          action: copyAction,
        });
        void reportSerialEvent({
          command: "test",
          sent: true,
          response: null,
          deviceGuid: deviceRef.current?.guid,
        });
        disconnect();
      }
    },
    [
      toast,
      runPreTestHooks,
      sendTest,
      sendCommand,
      disconnect,
      t,
      copyCommLog,
      showSensorBlockedToast,
    ],
  );

  useEffect(() => {
    runConnectTestRef.current = runConnectTest;
  }, [runConnectTest]);

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
    [toast, station.id, t],
  );

  const notifySorterLimit = useCallback(() => {
    showSorterLimitToast(toast, t, stationsRef.current.sorterLimitIsHardCap);
  }, [toast, t]);

  // Fast in-tab check before claiming a device record. The server's lease
  // (acquired after binding, below) is the real enforcement, across every
  // browser and computer in the org.
  const exceedsSorterLimit = useCallback(() => {
    const { stations, connectedStationIds, maxConnectedSorters } =
      stationsRef.current;
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
    [toast, activeOrg?.id, queryClient, claimForStation, t],
  );

  // Firmware older than the boot-banner `id` can't say which board it is.
  // With only one device on the org there's no ambiguity, so bind to it;
  // otherwise keep whatever this station already shows, bound so no other
  // station falls back to the same device record.
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
    });
    return current ? claimForStation(current) : current;
  }, [activeOrg?.id, queryClient, claimForStation, toast, t]);

  const findAutoConnectDevice = useCallback(
    async (hardwareId: string): Promise<Device | undefined> => {
      if (!activeOrg?.id) return undefined;
      const devices = await queryClient
        .ensureQueryData(devicesQueryOptions(activeOrg.id))
        .catch(() => []);
      return devices.find(
        (device) => device.hardwareId === hardwareId && device.autoConnect,
      );
    },
    [activeOrg?.id, queryClient],
  );

  const notifyBoardInUse = useCallback(
    (hardwareId: string) => {
      const devices = queryClient.getQueryData(
        devicesQueryOptions(activeOrg?.id).queryKey,
      );
      const name =
        devices?.find((device) => device.hardwareId === hardwareId)?.name ??
        hardwareId;
      toast.error(t("serial.deviceInUse.title"), {
        description: t("serial.deviceInUse.description", { name }),
      });
    },
    [toast, activeOrg?.id, queryClient, t],
  );

  const markRecovery = useCallback(() => {
    const hardwareId = deviceRef.current?.hardwareId;
    recoveryMarkRef.current = hardwareId
      ? { hardwareId, until: Date.now() + SERIAL_RECOVERY_SKIP_TEST_MS }
      : null;
  }, []);

  const consumeRecovery = useCallback((hardwareId: string | null) => {
    const mark = recoveryMarkRef.current;
    recoveryMarkRef.current = null;
    return (
      !!mark &&
      mark.hardwareId === hardwareId &&
      mark.until > Date.now()
    );
  }, []);

  const handleConnectionLost = useCallback(
    (lostTransport: ByteTransport) => {
      if (transportRef.current !== lostTransport) return;
      console.warn("[Device] Connection lost, disconnecting");
      markRecovery();
      const lostGuid = leasedDeviceGuidRef.current;
      const reconnectTo =
        lostTransport.kind === "bluetooth" &&
        lostGuid &&
        isAutoConnectDeviceRef.current(lostGuid)
          ? (lostTransport as BluetoothTransport).bluetoothDevice
          : null;
      disconnect();
      if (reconnectTo && lostGuid) {
        startBluetoothReconnectRef.current(reconnectTo, lostGuid);
      }
    },
    [disconnect, markRecovery],
  );

  const resetReasonText = useCallback(
    (status: unknown) =>
      t(`serial.resetReasons.${statusResetReason(status) ?? "unknown"}`),
    [t],
  );

  const noticeAbnormalBoot = useCallback(
    (hardwareId: string, status: unknown) => {
      const reason = statusResetReason(status);
      const uptimeMs = statusUptimeMs(status);
      if (
        !reason ||
        uptimeMs === null ||
        !SERIAL_ABNORMAL_RESET_REASONS.includes(reason) ||
        !claimBootNotice(hardwareId, uptimeMs)
      ) {
        return;
      }
      toast.warning(t("serial.abnormalBoot.title"), {
        description: t("serial.abnormalBoot.description", {
          reason: resetReasonText(status),
        }),
      });
      void reportSerialEvent({
        command: "reset",
        sent: true,
        response: status,
        deviceGuid: deviceRef.current?.guid,
      });
    },
    [toast, t, resetReasonText],
  );

  const handleUnexpectedReset = useCallback(
    (status: unknown) => {
      const activeTransport = transportRef.current;
      if (!activeTransport) return;
      console.warn("[Device] Sorter restarted unexpectedly", status);
      pushCommLog("restarted", statusResetReason(status) ?? "unknown");
      markRecovery();
      resetWatchArmedRef.current = false;
      lastUptimeMsRef.current = statusUptimeMs(status);
      for (const pending of pendingRef.current) pending.resolve("");
      pendingRef.current = [];
      setIsReady(false);
      const hardwareId = deviceRef.current?.hardwareId;
      const uptimeMs = statusUptimeMs(status);
      if (hardwareId && uptimeMs !== null) {
        claimBootNotice(hardwareId, uptimeMs);
      }
      toast.warning(t("serial.unexpectedReset.title"), {
        description: t("serial.unexpectedReset.description", {
          reason: resetReasonText(status),
        }),
      });
      void reportSerialEvent({
        command: "reset",
        sent: true,
        response: status,
        deviceGuid: deviceRef.current?.guid,
      });
      const forDevice = deviceRef.current;
      void (async () => {
        if (!forDevice || forDevice.setupCompletedAt) {
          await syncWithoutTest(activeTransport, forDevice);
        }
        if (transportRef.current === activeTransport) {
          resetWatchArmedRef.current = true;
        }
      })();
    },
    [toast, t, resetReasonText, syncWithoutTest, markRecovery, pushCommLog],
  );

  useEffect(() => {
    handleUnexpectedResetRef.current = handleUnexpectedReset;
  }, [handleUnexpectedReset]);

  const openTransport = useCallback(
    async (
      newTransport: ByteTransport,
      options?: { skipAutoTest?: boolean; autoConnect?: boolean },
    ): Promise<{ identified: Promise<unknown> }> => {
      pushCommLog("connected", newTransport.kind);
      taggedRepliesRef.current = false;
      resetWatchArmedRef.current = false;
      lastUptimeMsRef.current = null;
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
          deviceGuid: deviceRef.current?.guid,
        });
      });
      newTransport.onDisconnect(() => handleConnectionLost(newTransport));
      await newTransport.start();

      const markConnected = () => {
        setIsConnected(true);
        setTransport(newTransport.kind);
      };
      if (!options?.autoConnect) markConnected();

      const identify = async (): Promise<{
        device?: Device;
        hardwareId: string | null;
      } | null> => {
        const deadline = Date.now() + SERIAL_IDENTIFY_TIMEOUT_MS;
        let status: Record<string, unknown> | null = null;
        for (
          let attempt = 0;
          attempt < SERIAL_IDENTIFY_ATTEMPTS && !status;
          attempt++
        ) {
          const remaining = deadline - Date.now();
          if (remaining <= 0 || transportRef.current !== newTransport) break;
          const { sent, line } = await sendRequest(
            { getStatus: true },
            Math.min(remaining, SERIAL_IDENTIFY_ATTEMPT_TIMEOUT_MS),
          );
          if (!sent) break;
          try {
            const parsed = JSON.parse(line);
            if (typeof parsed?.version === "string") status = parsed;
          } catch {}
        }
        if (transportRef.current !== newTransport) return null;
        if (typeof status?.bleMtu === "number") {
          newTransport.setMtu?.(status.bleMtu);
        }
        const hardwareId =
          typeof status?.id === "string" && status.id ? status.id : null;
        if (
          hardwareId &&
          !stationsRef.current.claimHardware(station.id, hardwareId)
        ) {
          if (!options?.autoConnect) notifyBoardInUse(hardwareId);
          disconnect();
          return null;
        }
        if (options?.autoConnect) {
          const known = hardwareId
            ? await findAutoConnectDevice(hardwareId)
            : undefined;
          if (transportRef.current !== newTransport) return null;
          if (!known) {
            disconnect();
            return null;
          }
          markConnected();
        }
        if (typeof status?.version === "string") {
          setFirmwareVersion(status.version);
        }
        if (status?.board === "esp32" || status?.board === "uno_r4") {
          setBoard(status.board);
        }
        setHasWifi(typeof status?.wifi === "string");
        if (hardwareId) setDeviceId(hardwareId);
        lastUptimeMsRef.current = statusUptimeMs(status);
        if (hardwareId) noticeAbnormalBoot(hardwareId, status);
        if (exceedsSorterLimit()) {
          disconnect();
          return null;
        }
        const boundDevice = hardwareId
          ? await bindBoard(hardwareId)
          : await bindUnidentifiedBoard();
        if (transportRef.current !== newTransport) return null;
        if (boundDevice === null) {
          disconnect();
          return null;
        }
        if (boundDevice) {
          const leased = await acquireDeviceLease(boundDevice.guid);
          if (transportRef.current !== newTransport) return null;
          if (!leased) {
            notifySorterLimit();
            disconnect();
            return null;
          }
          leasedDeviceGuidRef.current = boundDevice.guid;
          setLeasedDeviceGuid(boundDevice.guid);
          if (newTransport.kind === "bluetooth") {
            rememberBleDevice(
              (newTransport as BluetoothTransport).bluetoothDevice.id,
              boundDevice.guid,
            );
          }
        }
        if (options?.autoConnect && !boundDevice?.autoConnect) {
          disconnect();
          return null;
        }
        return { device: boundDevice, hardwareId };
      };

      const identified = identify();
      void identified.then(async (result) => {
        if (
          result &&
          transportRef.current === newTransport &&
          taggedRepliesRef.current
        ) {
          resetWatchArmedRef.current = true;
        }
        if (!result || options?.skipAutoTest) return;
        const boundDevice = result.device;
        if (boundDevice && !boundDevice.setupCompletedAt) return;
        if (
          (boundDevice && !boundDevice.testOnConnect) ||
          consumeRecovery(result.hardwareId)
        ) {
          await syncWithoutTest(newTransport, boundDevice);
          return;
        }
        await runConnectTest(newTransport, boundDevice);
      });

      return { identified };
    },
    [
      toast,
      pushCommLog,
      handleIncomingChunk,
      sendRequest,
      exceedsSorterLimit,
      notifySorterLimit,
      bindBoard,
      bindUnidentifiedBoard,
      findAutoConnectDevice,
      notifyBoardInUse,
      station.id,
      runConnectTest,
      syncWithoutTest,
      disconnect,
      handleConnectionLost,
      noticeAbnormalBoot,
      consumeRecovery,
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
          deviceGuid: deviceRef.current?.guid,
        });
        return;
      }

      await openTransport(result.transport, options);
    },
    [toast, openTransport, t],
  );

  const connectPort = useCallback(
    async (port: SerialPort) => {
      if (disconnectingRef.current) {
        await disconnectingRef.current;
      }
      if (transportRef.current) return;
      const transport = await SerialTransport.openGranted(port);
      if (!transport) return;
      const { identified } = await openTransport(transport, {
        autoConnect: true,
      });
      await identified;
    },
    [openTransport],
  );

  const connectBluetoothDevice = useCallback(
    async (device: BluetoothDevice) => {
      if (disconnectingRef.current) {
        await disconnectingRef.current;
      }
      if (transportRef.current) return;
      const transport = await BluetoothTransport.connectDevice(device);
      if (!transport) return;
      if (transportRef.current) {
        await transport.close();
        return;
      }
      await openTransport(transport, { autoConnect: true });
    },
    [openTransport],
  );

  const isAutoConnectDeviceRef = useRef<(guid: string) => boolean>(() => false);
  isAutoConnectDeviceRef.current = (guid: string) => {
    const devices = queryClient.getQueryData(
      devicesQueryOptions(activeOrg?.id).queryKey,
    );
    return !!devices?.find((d) => d.guid === guid)?.autoConnect;
  };

  const [bleReconnect] = useState<BleReconnectState>(() => ({ cancel: null }));
  const cancelBluetoothReconnect = useCallback(() => {
    bleReconnect.cancel?.();
    bleReconnect.cancel = null;
  }, [bleReconnect]);

  const startBluetoothReconnect = useCallback(
    (device: BluetoothDevice, deviceGuid: string) => {
      cancelBluetoothReconnect();
      let cancelled = false;
      bleReconnect.cancel = () => {
        cancelled = true;
      };
      void (async () => {
        for (let attempt = 0; !cancelled; attempt++) {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Math.min(
                BLE_RECONNECT_BASE_DELAY_MS * 2 ** attempt,
                BLE_RECONNECT_MAX_DELAY_MS,
              ),
            ),
          );
          if (
            cancelled ||
            transportRef.current ||
            !isAutoConnectDeviceRef.current(deviceGuid) ||
            stationsRef.current.isDeviceConnected(deviceGuid)
          ) {
            return;
          }
          await connectBluetoothDevice(device);
          if (transportRef.current) return;
        }
      })();
    },
    [bleReconnect, cancelBluetoothReconnect, connectBluetoothDevice],
  );
  const startBluetoothReconnectRef = useRef(startBluetoothReconnect);
  startBluetoothReconnectRef.current = startBluetoothReconnect;

  useEffect(() => cancelBluetoothReconnect, [cancelBluetoothReconnect]);

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
            deviceGuid: deviceRef.current?.guid,
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
          deviceGuid: deviceRef.current?.guid,
        });
        return;
      }

      await openTransport(result.transport, options);
    },
    [toast, openTransport, t],
  );

  const connectCloud = useCallback(
    async (
      deviceGuid: string,
      options?: { skipAutoTest?: boolean },
    ): Promise<boolean> => {
      if (disconnectingRef.current) {
        await disconnectingRef.current;
      }
      if (transportRef.current) return false;

      const url = await sorterLinkClientUrl(deviceGuid);
      const result = url
        ? await CloudTransport.open(url)
        : ({ ok: false, reason: "failed" } as const);
      if (!result.ok) {
        toast.error(t("serial.connectionFailed.title"), {
          description: t(`serial.cloud.${result.reason}`),
        });
        return false;
      }
      if (transportRef.current) {
        await result.transport.close();
        return false;
      }
      await openTransport(result.transport, options);
      return true;
    },
    [toast, openTransport, t],
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
        connectCloud: (deviceGuid: string) => connectCloud(deviceGuid),
        connectPort,
        connectBluetoothDevice,
        disconnect,
      }),
    [
      station.id,
      connect,
      connectBluetooth,
      connectCloud,
      connectPort,
      connectBluetoothDevice,
      disconnect,
    ],
  );

  const flashEsp32 = useCallback(
    async (firmwareUrl: string): Promise<FlashEsp32Result> => {
      const activeTransport = transportRef.current;
      if (!activeTransport || activeTransport.kind !== "serial") {
        return { success: false, error: t("serial.update.notUsb") };
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
    [disconnect, t],
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
      if (fields.error === SERIAL_PUSH_BLOCKED_ERROR) {
        toast.error(t("serial.pushBlocked.title"), {
          description: t("serial.pushBlocked.description", {
            module: fields.module,
          }),
        });
      }

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
  }, [toast, t]);

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

  const binBusyRef = useRef(false);
  const isRouteBusy = useCallback(() => binBusyRef.current, []);

  useEffect(() => {
    if (!isConnected || !isReady || isFlashing) return;
    let misses = 0;
    let checking = false;
    const interval = setInterval(async () => {
      const activeTransport = transportRef.current;
      if (
        checking ||
        !activeTransport ||
        !resetWatchArmedRef.current ||
        binBusyRef.current ||
        pendingRef.current.length > 0
      ) {
        return;
      }
      checking = true;
      try {
        const { sent, line } = await sendRequest(
          { getStatus: true },
          SERIAL_HEARTBEAT_TIMEOUT_MS,
        );
        if (transportRef.current !== activeTransport) return;
        if (!sent || !line) {
          misses += 1;
          if (misses < SERIAL_HEARTBEAT_MAX_MISSES) return;
          toast.error(t("serial.heartbeatLost.title"), {
            description: t("serial.heartbeatLost.description"),
          });
          void reportSerialEvent({
            command: "connect",
            sent,
            response: null,
            deviceGuid: deviceRef.current?.guid,
          });
          handleConnectionLost(activeTransport);
          return;
        }
        misses = 0;
        let status: unknown;
        try {
          status = JSON.parse(line);
        } catch {
          return;
        }
        const uptimeMs = statusUptimeMs(status);
        if (uptimeMs === null) return;
        const previous = lastUptimeMsRef.current;
        lastUptimeMsRef.current = uptimeMs;
        if (previous !== null && uptimeMs < previous) {
          handleUnexpectedResetRef.current(status);
        }
      } finally {
        checking = false;
      }
    }, SERIAL_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [toast, isConnected, isReady, isFlashing, sendRequest, handleConnectionLost, t]);

  const checkFirmwareVersion =
    useCallback(async (): Promise<FirmwareCheckResult> => {
      if (!transportRef.current) return { status: "disconnected" };
      if (binBusyRef.current) return { status: "busy" };

      binBusyRef.current = true;
      try {
        const { line: response } = await sendRequest({ getStatus: true });
        if (!response) return { status: "noResponse" };

        try {
          const parsed = JSON.parse(response);
          if (parsed?.board === "esp32" || parsed?.board === "uno_r4") {
            setBoard(parsed.board);
          }
          if (typeof parsed?.wifi === "string") setHasWifi(true);
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
    }, [sendRequest]);

  const sendAwaited = useCallback(
    async (payload: unknown, timeoutMs: number): Promise<unknown | null> => {
      if (!transportRef.current) return null;
      if (binBusyRef.current) return null;

      binBusyRef.current = true;
      try {
        const { line: response } = await sendRequest(
          payload as object,
          timeoutMs,
        );
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
    [sendRequest],
  );

  const routeQueueRef = useRef<{
    tail: Promise<unknown | null>;
    pending: number;
  }>({ tail: Promise.resolve(null), pending: 0 });

  const sendRoute = useCallback(
    (route: BinRoute, options: RouteOptions = {}) => {
      const queue = routeQueueRef.current;
      const waitsOnPrevious = queue.pending > 0;
      queue.pending += 1;
      const next = queue.tail
        .then((previous) => {
          if (waitsOnPrevious && isFailedRouteResponse(previous)) {
            return { skipped: true } satisfies SkippedRouteResponse;
          }
          return sendAwaited(
            {
              route: {
                module: route.module,
                direction: route.direction,
                ...(options.feedNext ? { feedNext: true } : {}),
              },
            },
            options.feedNext
              ? ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS
              : ROUTE_RESPONSE_TIMEOUT_MS,
          );
        })
        .finally(() => {
          queue.pending -= 1;
        });
      queue.tail = next.catch(() => null);
      return next;
    },
    [sendAwaited],
  );

  const readIR = useCallback((): Promise<boolean[] | null> => {
    const queue = routeQueueRef.current;
    const previousTail = queue.tail;
    const reading = previousTail.then(() =>
      sendAwaited({ readIR: true }, JAM_COMMAND_TIMEOUT_MS),
    );
    queue.tail = reading.then(
      () => previousTail,
      () => previousTail,
    );
    return reading.then((response) => {
      const ir = (response as Record<string, unknown> | null)?.ir;
      return Array.isArray(ir) ? ir.map((value) => value === true) : null;
    });
  }, [sendAwaited]);

  const sendNeutral = useCallback((): Promise<boolean> => {
    const queue = routeQueueRef.current;
    const previousTail = queue.tail;
    const reset = previousTail.then(() =>
      sendAwaited({ neutral: true }, NEUTRAL_RESPONSE_TIMEOUT_MS),
    );
    queue.tail = reset.then(
      () => previousTail,
      () => previousTail,
    );
    return reset.then(
      (response) =>
        (response as Record<string, unknown> | null)?.status === "ok",
    );
  }, [sendAwaited]);

  const reopenSensorBlockedToast = useCallback(() => {
    reopenSensorBlockedToastRef.current?.();
  }, []);

  const sendPushTest = useCallback(
    (test: PushTest) =>
      sendAwaited({ pushTest: test }, PUSH_TEST_RESPONSE_TIMEOUT_MS),
    [sendAwaited],
  );

  const sendRawCommand = useCallback(
    async (line: string, timeoutMs: number): Promise<RawCommandResult> => {
      if (!transportRef.current) return { status: "disconnected", line: null };
      if (binBusyRef.current) return { status: "busy", line: null };

      binBusyRef.current = true;
      try {
        const { line: response } = await requestLine(line, timeoutMs);
        return response
          ? { status: "ok", line: response }
          : { status: "noResponse", line: null };
      } finally {
        binBusyRef.current = false;
      }
    },
    [requestLine],
  );

  return (
    <SerialContext
      value={{
        isConnected,
        isReady,
        sensorBlockedModule,
        reopenSensorBlockedToast,
        firmwareVersion,
        board,
        hasWifi,
        deviceId,
        transport,
        connect,
        connectBluetooth,
        connectCloud,
        disconnect,
        sendRoute,
        sendPushTest,
        sendRawCommand,
        isRouteBusy,
        readIR,
        sendNeutral,
        sendTest,
        runTest: runTestOnActiveTransport,
        checkFirmwareVersion,
        sendCommand,
        sendRequest,
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
