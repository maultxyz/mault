import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import {
  formatCommLog,
  MAX_COMM_LOG_ENTRIES,
  type CommLogEntry,
} from "@/features/scanner/lib/comm-log";
import {
  BluetoothTransport,
  SerialTransport,
  type ByteTransport,
} from "@/features/scanner/lib/transports";
import type {
  FlashEsp32Result,
  SerialBoardType,
  SerialContextValue,
  SerialMessageListener,
  TestResult,
} from "@/lib/interfaces/scanner";
import type { BinRoute } from "@magic-vault/shared";
import { ESPLoader, Transport as EspLoaderTransport } from "esptool-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
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
  const [transport, setTransport] = useState<SerialContextValue["transport"]>(
    null,
  );
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<number | null>(null);
  const [flashLog, setFlashLog] = useState<string[]>([]);
  const transportRef = useRef<ByteTransport | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const bufferRef = useRef("");
  const pendingRef = useRef<Array<(line: string) => void>>([]);
  const listenersRef = useRef(new Set<SerialMessageListener>());
  const disconnectingRef = useRef<Promise<void> | null>(null);
  const preTestHookRef = useRef<(() => Promise<void>) | null>(null);
  const commLogRef = useRef<CommLogEntry[]>([]);

  const decoderRef = useRef(new TextDecoder());

  const pushCommLog = useCallback(
    (direction: CommLogEntry["direction"], text: string) => {
      commLogRef.current.push({ direction, text, timestamp: Date.now() });
      if (commLogRef.current.length > MAX_COMM_LOG_ENTRIES) {
        commLogRef.current.shift();
      }
    },
    [],
  );

  const getCommLog = useCallback(() => [...commLogRef.current], []);

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
        const trimmed = jsonStart > 0 ? rawTrimmed.slice(jsonStart) : rawTrimmed;

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

    transportRef.current = null;
    writeQueueRef.current = Promise.resolve();
    setIsConnected(false);
    setIsReady(false);
    setFirmwareVersion(null);
    setBoard(null);
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
    async (forTransport: ByteTransport) => {
      if (preTestHookRef.current) {
        await preTestHookRef.current();
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
        void reportSerialEvent({ command: "connect", sent: false, response: null });
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
        const bootLinePromise = waitForLine(5000);
        await sendCommand(JSON.stringify({ getStatus: true }) + "\n");
        const bootLine = await bootLinePromise;
        if (transportRef.current !== newTransport) return;
        try {
          const parsed = bootLine ? JSON.parse(bootLine) : null;
          if (typeof parsed?.version === "string") {
            setFirmwareVersion(parsed.version);
          }
          if (parsed?.board === "esp32" || parsed?.board === "uno_r4") {
            setBoard(parsed.board);
          }
        } catch {}
        if (options?.skipAutoTest) return;
        await runConnectTest(newTransport);
      })();

      return true;
    },
    [handleIncomingChunk, waitForLine, sendCommand, runConnectTest, disconnect, t],
  );

  const runTestOnActiveTransport = useCallback(async () => {
    const activeTransport = transportRef.current;
    if (!activeTransport) return;
    await runConnectTest(activeTransport);
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
        void reportSerialEvent({ command: "connect", sent: false, response: null });
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
          void reportSerialEvent({ command: "connect", sent: false, response: null });
          return;
        }
        toast.error(t("serial.connectionFailed.title"), {
          description: result.message || t("serial.connectionFailed.description"),
        });
        void reportSerialEvent({ command: "connect", sent: false, response: null });
        return;
      }

      await openTransport(result.transport, options);
    },
    [openTransport, t],
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

        const response = await fetch(firmwareUrl);
        if (!response.ok) {
          throw new Error(`Failed to download firmware (${response.status})`);
        }
        const firmwareData = new Uint8Array(await response.arrayBuffer());

        const espTransport = new EspLoaderTransport(port);
        const loader = new ESPLoader({
          transport: espTransport,
          baudrate: 115200,
          terminal: {
            clean: () => setFlashLog([]),
            writeLine: (line) => setFlashLog((prev) => [...prev, line]),
            write: (line) => setFlashLog((prev) => [...prev, line]),
          },
        });

        await loader.main();
        await loader.writeFlash({
          fileArray: [{ data: firmwareData, address: 0 }],
          flashMode: "keep",
          flashFreq: "keep",
          flashSize: "keep",
          eraseAll: false,
          compress: true,
          reportProgress: (_fileIndex, written, total) => {
            setFlashProgress(total > 0 ? written / total : null);
          },
        });
        await loader.after("hard_reset");
        await espTransport.disconnect();

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Flash failed.",
        };
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
        (activeTransport as SerialTransport).port === (event.target as SerialPort)
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
      if (
        typeof msg === "object" &&
        msg !== null &&
        "status" in msg &&
        (msg as Record<string, unknown>).status === "test_complete"
      ) {
        setIsReady(true);
      }
    };
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const subscribe = useCallback((listener: SerialMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const registerPreTestHook = useCallback((fn: () => Promise<void>) => {
    const previous = preTestHookRef.current;
    preTestHookRef.current = previous
      ? async () => {
          try {
            await previous();
          } catch (e) {
            console.error("[Serial] Pre-test hook failed:", e); // eslint-disable-line no-console -- hardware debug trace
          }
          await fn();
        }
      : fn;
    return () => {
      preTestHookRef.current = previous;
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
        transport,
        connect,
        connectBluetooth,
        disconnect,
        sendRoute,
        isRouteBusy,
        sendTest,
        runTest: runTestOnActiveTransport,
        sendCommand: sendCommandWithNewline,
        receiveResponse,
        subscribe,
        registerPreTestHook,
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

export function useSerialMessage(listener: SerialMessageListener) {
  const { subscribe } = useSerial();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return subscribe((msg) => listenerRef.current(msg));
  }, [subscribe]);
}
