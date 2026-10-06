import type { Device } from "@/features/calibration/api/devices";
import {
  feederQueryOptions,
  saveFeederConfig,
} from "@/features/calibration/api/feeder-config";
import {
  modulesQueryOptions,
  saveModuleConfig,
} from "@/features/calibration/api/module-configs";
import { CalibrationConflictDialog } from "@/features/calibration/components/calibration-conflict-dialog";
import {
  adoptStoredModules,
  diffCalibration,
  parseStoredFeeder,
  parseStoredModule,
} from "@/features/calibration/lib/stored-calibration";
import { useSerial } from "@/features/scanner/api/use-serial";
import { STORE_CONFIG_TIMEOUT_MS } from "@/lib/constants/timing";
import type {
  CalibrationConflict,
  CalibrationDifference,
  CalibrationSource,
  DeviceCalibration,
  DeviceCalibrationSyncContextValue,
  StoredCalibration,
  StoredCalibrationRead,
} from "@/lib/interfaces/calibration";
import { toast } from "@/lib/toast";
import {
  CHANNEL_OFFSET,
  DEFAULT_CHANNEL_LAYOUT,
  isFirmwareFeatureSupported,
  type ModuleConfig,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const DeviceCalibrationSyncContext =
  createContext<DeviceCalibrationSyncContextValue | null>(null);

export function DeviceCalibrationSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("calibration");
  const queryClient = useQueryClient();
  const {
    sendCommand,
    receiveResponse,
    registerPreTestHook,
    isConnected,
    firmwareVersion,
  } = useSerial();
  const [conflict, setConflict] = useState<CalibrationConflict | null>(null);
  const resolveConflictRef = useRef<
    ((source: CalibrationSource | null) => void) | null
  >(null);

  const request = useCallback(
    async (command: object, timeoutMs?: number) => {
      const reply = receiveResponse(timeoutMs);
      const sent = await sendCommand(JSON.stringify(command));
      const line = sent ? await reply : "";
      let parsed: Record<string, unknown> | null = null;
      try {
        const value: unknown = line ? JSON.parse(line) : null;
        if (value && typeof value === "object") {
          parsed = value as Record<string, unknown>;
        }
      } catch {}
      return { line, parsed };
    },
    [sendCommand, receiveResponse],
  );

  const sendChecked = useCallback(
    async (command: object, failureTitle: string) => {
      const { line, parsed } = await request(command);
      if (parsed?.error) {
        toast.error(failureTitle, { description: String(parsed.error) });
      } else if (!parsed) {
        toast.error(failureTitle, {
          description: line
            ? t("toasts.unexpectedResponse", { response: line })
            : t("toasts.noResponse"),
        });
      }
    },
    [request, t],
  );

  const pushCalibration = useCallback(
    async (calibration: Partial<DeviceCalibration>) => {
      for (const config of calibration.modules ?? []) {
        await sendChecked(
          {
            setConfig: { module: config.moduleNumber, ...config.calibration },
          },
          t("useModuleConfigs.toasts.notSynced", {
            module: config.moduleNumber,
          }),
        );
      }
      if (calibration.feeder) {
        await sendChecked(
          { setFeederConfig: calibration.feeder },
          t("useFeederConfig.toasts.notSynced"),
        );
      }
    },
    [sendChecked, t],
  );

  const storeOnDevice = useCallback(async () => {
    const { parsed } = await request(
      { storeConfig: true },
      STORE_CONFIG_TIMEOUT_MS,
    );
    if (parsed?.status !== "ok") {
      toast.error(t("storedCalibration.toasts.storeFailed"), {
        description: parsed?.error ? String(parsed.error) : undefined,
      });
    }
  }, [request, t]);

  const readStoredCalibration = useCallback(
    async (moduleCount: number): Promise<StoredCalibrationRead> => {
      const { parsed: summary } = await request({ getStoredConfig: true });
      if (typeof summary?.stored !== "boolean") return { status: "unsupported" };
      if (!summary.stored) return { status: "empty" };
      const storedCount = Math.min(moduleCount, Number(summary.modules) || 0);
      const modules: ModuleConfig[] = [];
      for (let moduleNumber = 1; moduleNumber <= storedCount; moduleNumber++) {
        const { parsed } = await request({ getStoredConfig: moduleNumber });
        const calibration = parseStoredModule(parsed);
        if (!calibration) return { status: "empty" };
        modules.push({ moduleNumber, calibration });
      }
      const { parsed: feederReply } = await request({
        getStoredConfig: "feeder",
      });
      const feeder = parseStoredFeeder(feederReply);
      if (!feeder) return { status: "empty" };
      return {
        status: "stored",
        calibration: {
          channelOffset: Number(summary.channelOffset),
          dirty: summary.dirty === true,
          modules,
          feeder,
        },
      };
    },
    [request],
  );

  const askForSource = useCallback(
    (next: CalibrationConflict) =>
      new Promise<CalibrationSource | null>((resolve) => {
        resolveConflictRef.current = resolve;
        setConflict(next);
      }),
    [],
  );

  const choose = useCallback((source: CalibrationSource) => {
    const resolve = resolveConflictRef.current;
    resolveConflictRef.current = null;
    setConflict(null);
    resolve?.(source);
  }, []);

  useEffect(() => {
    if (isConnected) return;
    resolveConflictRef.current?.(null);
    resolveConflictRef.current = null;
  }, [isConnected]);

  const fetchSavedCalibration = useCallback(
    async (deviceGuid: string, fresh = false): Promise<DeviceCalibration> => {
      const overrides = fresh ? { staleTime: 0 } : {};
      const [modules, feeder] = await Promise.all([
        queryClient.fetchQuery({
          ...modulesQueryOptions(deviceGuid),
          ...overrides,
        }),
        queryClient.fetchQuery({
          ...feederQueryOptions(deviceGuid),
          ...overrides,
        }),
      ]);
      return { modules, feeder };
    },
    [queryClient],
  );

  const adoptStoredCalibration = useCallback(
    async (
      target: Device,
      app: DeviceCalibration,
      stored: StoredCalibration,
      differences: CalibrationDifference[],
    ): Promise<DeviceCalibration> => {
      const moduleNumbers = [
        ...new Set(
          differences.flatMap((d) =>
            d.moduleNumber === null ? [] : [d.moduleNumber],
          ),
        ),
      ];
      const feederChanged = differences.some((d) => d.moduleNumber === null);
      const adopted: DeviceCalibration = {
        modules: adoptStoredModules(app.modules, stored, moduleNumbers),
        feeder: feederChanged ? stored.feeder : app.feeder,
      };
      try {
        for (const config of adopted.modules) {
          if (!moduleNumbers.includes(config.moduleNumber)) continue;
          const result = await saveModuleConfig(
            target.guid,
            config.moduleNumber,
            config.calibration,
          );
          if (!result.success) throw new Error(result.message);
        }
        if (feederChanged) {
          const result = await saveFeederConfig(target.guid, stored.feeder);
          if (!result.success) throw new Error(result.message);
        }
      } catch {
        toast.error(t("storedCalibration.toasts.adoptFailed"));
        return fetchSavedCalibration(target.guid, true);
      }
      queryClient.setQueryData(
        modulesQueryOptions(target.guid).queryKey,
        adopted.modules,
      );
      queryClient.setQueryData(
        feederQueryOptions(target.guid).queryKey,
        adopted.feeder,
      );
      void queryClient.invalidateQueries({ queryKey: ["modules", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["feeder", "history"] });
      toast.success(t("storedCalibration.toasts.adopted"));
      return adopted;
    },
    [queryClient, fetchSavedCalibration, t],
  );

  useEffect(() => {
    return registerPreTestHook(async (target) => {
      const channelOffset =
        CHANNEL_OFFSET[target?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT];
      if (!target) {
        await request({ setChannelOffset: channelOffset });
        return;
      }

      let calibration = await fetchSavedCalibration(target.guid);
      const stored = await readStoredCalibration(target.moduleCount);
      if (stored.status === "stored") {
        const differences = diffCalibration(
          calibration,
          stored.calibration,
          target.moduleCount,
        );
        if (
          differences.length === 0 &&
          !stored.calibration.dirty &&
          stored.calibration.channelOffset === channelOffset
        ) {
          return;
        }
        if (differences.length > 0) {
          const source = await askForSource({
            deviceName: target.name,
            differences,
          });
          if (source === null) return;
          if (source === "device") {
            calibration = await adoptStoredCalibration(
              target,
              calibration,
              stored.calibration,
              differences,
            );
          }
        }
      }

      await request({ setChannelOffset: channelOffset });
      await pushCalibration(calibration);
      if (stored.status !== "unsupported") await storeOnDevice();
    });
  }, [
    registerPreTestHook,
    request,
    fetchSavedCalibration,
    readStoredCalibration,
    askForSource,
    adoptStoredCalibration,
    pushCalibration,
    storeOnDevice,
  ]);

  const applyToDevice = useCallback(
    async (changes: Partial<DeviceCalibration>) => {
      if (!isConnected) return;
      await pushCalibration(changes);
      if (isFirmwareFeatureSupported(firmwareVersion, "storedCalibration")) {
        await storeOnDevice();
      }
    },
    [isConnected, firmwareVersion, pushCalibration, storeOnDevice],
  );

  return (
    <DeviceCalibrationSyncContext value={{ applyToDevice }}>
      {children}
      <CalibrationConflictDialog
        conflict={isConnected ? conflict : null}
        onChoose={choose}
      />
    </DeviceCalibrationSyncContext>
  );
}

export function useDeviceCalibrationSync() {
  const context = useContext(DeviceCalibrationSyncContext);
  if (!context) {
    throw new Error(
      "useDeviceCalibrationSync must be used within a DeviceCalibrationSyncProvider",
    );
  }
  return context;
}
