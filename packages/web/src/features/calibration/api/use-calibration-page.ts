import { binRoutesQueryOptions, saveBinRoute } from "@/features/calibration/api/bin-routes";
import { devicesQueryOptions, saveDevice } from "@/features/calibration/api/devices";
import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import { useDevice } from "@/features/calibration/api/use-device";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useOrg } from "@/features/companies/api/use-organization";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import {
  buildCalibrationDebugText,
  defaultSliderValues,
  getCalibrationKey,
} from "@/features/calibration/lib/calibration-utils";
import {
  buildCalibrationExport,
  downloadCalibrationExport,
  parseCalibrationExport,
} from "@/features/calibration/lib/calibration-export";
import { useConnectWithStaleCheck } from "@/hooks/use-connect-with-stale-check";
import type {
  ActivePositions,
  ModuleDelayField,
  SliderKey,
} from "@/lib/interfaces/calibration";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  CALIBRATION_PREVIEW_DEBOUNCE_MS,
  CALIBRATION_STEP_SETTLE_MS,
  SERVO_TEST_GATE_HOLD_MS,
  SERVO_TEST_PUSHER_HOLD_MS,
} from "@/lib/constants/timing";
import {
  computeBinCount,
  DEFAULT_CALIBRATION,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  type BinRoute,
  type ScanRegion,
  type ServoCalibration,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useCalibrationPage() {
  const { t } = useTranslation("calibration");
  const {
    isConnected,
    disconnect,
    sendCommand,
    sendRoute,
    sendPushTest,
    sendTest,
    receiveResponse,
    firmwareVersion,
    board,
  } = useSerial();
  const {
    connect,
    connectBluetooth,
    staleDialogOpen,
    onDismissStaleDialog,
    onRunTest,
    onCalibrateFirst,
  } = useConnectWithStaleCheck();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const { feederConfig, saveConfig: saveFeeder, previewSpeed } = useFeederConfig();
  const { activeOrg } = useOrg();
  const device = useDevice();
  const queryClient = useQueryClient();
  const { isLoading } = useQuery(modulesQueryOptions(device?.guid));
  const { isLoading: isDeviceLoading } = useQuery(
    devicesQueryOptions(activeOrg?.id),
  );
  const moduleCount = useModuleCount();
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const { routes: binRoutes } = useBinRoutes();
  const channelLayout = useChannelLayout();

  const resolveRoute = useCallback(
    (binNumber: number): BinRoute =>
      binRoutes.find((r) => r.binNumber === binNumber) ?? {
        binNumber,
        module: moduleCount,
        direction: "bottom",
      },
    [binRoutes, moduleCount],
  );

  const [active, setActive] = useState<ActivePositions>({});
  const activeRef = useRef(active);
  activeRef.current = active;

  const configsRef = useRef(configs);
  configsRef.current = configs;

  const isUnconfigured =
    configs.length > 0 &&
    configs.every((c) =>
      (Object.keys(DEFAULT_CALIBRATION) as (keyof ServoCalibration)[]).every(
        (key) => c.calibration[key] === DEFAULT_CALIBRATION[key],
      ),
    );

  const [sliderValues, setSliderValues] = useState<Record<SliderKey, number>>(
    () => defaultSliderValues(modules),
  );

  const [pendingCalibration, setPendingCalibration] = useState<
    Record<number, Partial<ServoCalibration>>
  >({});
  const pendingCalibrationRef = useRef(pendingCalibration);
  pendingCalibrationRef.current = pendingCalibration;

  const moduleDelayValues = useMemo(() => {
    const vals: Record<number, Record<ModuleDelayField, number>> = {};
    for (const m of modules) {
      const cal = configs.find((c) => c.moduleNumber === m)?.calibration;
      const valueOf = (field: ModuleDelayField) =>
        pendingCalibration[m]?.[field] ??
        cal?.[field] ??
        DEFAULT_CALIBRATION[field];
      vals[m] = {
        pusherHoldDuration: valueOf("pusherHoldDuration"),
        paddleCloseDelay: valueOf("paddleCloseDelay"),
      };
    }
    return vals;
  }, [modules, configs, pendingCalibration]);

  const [scanRegionDraft, setScanRegionDraft] = useState<ScanRegion | null>(
    null,
  );
  const [captureSettleDraft, setCaptureSettleDraft] = useState<number | null>(
    null,
  );
  const [matchesNeededDraft, setMatchesNeededDraft] = useState<number | null>(
    null,
  );
  const isScanRegionDirty = scanRegionDraft !== null;
  const isCaptureSettleDirty = captureSettleDraft !== null;
  const [checkBothOrientationsDraft, setCheckBothOrientationsDraft] = useState<
    boolean | null
  >(null);
  const isMatchesNeededDirty = matchesNeededDraft !== null;
  const isCheckBothOrientationsDirty = checkBothOrientationsDraft !== null;
  const scanRegion = scanRegionDraft ?? device?.scanRegion ?? DEFAULT_SCAN_REGION;
  const captureSettleDelayMs =
    captureSettleDraft ??
    device?.captureSettleDelayMs ??
    DEFAULT_CAPTURE_SETTLE_DELAY_MS;
  const matchesNeeded =
    matchesNeededDraft ?? device?.matchesNeeded ?? DEFAULT_MATCHES_NEEDED;
  const checkBothOrientations =
    checkBothOrientationsDraft ??
    device?.checkBothOrientations ??
    DEFAULT_CHECK_BOTH_ORIENTATIONS;

  const handleScanRegionChange = useCallback((next: ScanRegion) => {
    setScanRegionDraft(next);
  }, []);

  const handleResetScanRegion = useCallback(() => {
    setScanRegionDraft({ ...DEFAULT_SCAN_REGION });
  }, []);

  const handleCaptureSettleChange = useCallback((value: number) => {
    setCaptureSettleDraft(value);
  }, []);

  const handleMatchesNeededChange = useCallback((value: number) => {
    setMatchesNeededDraft(value);
  }, []);

  const handleCheckBothOrientationsChange = useCallback((value: boolean) => {
    setCheckBothOrientationsDraft(value);
  }, []);

  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [testingServos, setTestingServos] = useState<Record<SliderKey, boolean>>(
    {},
  );
  const servoTestTimeoutsRef = useRef<
    Partial<Record<SliderKey, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    const timeouts = servoTestTimeoutsRef.current;
    return () => {
      for (const timeout of Object.values(timeouts)) clearTimeout(timeout);
    };
  }, []);

  const [activeBin, setActiveBinState] = useState<number | null>(null);
  const activeBinRef = useRef<number | null>(null);
  const setActiveBin = useCallback((v: number | null) => {
    activeBinRef.current = v;
    setActiveBinState(v);
  }, []);

  const [isTesting, setIsTesting] = useState(false);
  const [isSampleRunning, setIsSampleRunning] = useState(false);

  const [irStates, setIrStates] = useState<boolean[] | null>(null);
  const [hopperHasCards, setHopperHasCards] = useState<boolean | null>(null);
  const [irMonitoring, setIrMonitoring] = useState(false);
  const irBusyRef = useRef(false);

  const [feederSpeedValue, setFeederSpeedValue] = useState(feederConfig.speed);
  const [feederDurationValue, setFeederDurationValue] = useState(feederConfig.duration);
  const [feederPulseDurationValue, setFeederPulseDurationValue] = useState(feederConfig.pulseDuration);
  const [feederPauseDurationValue, setFeederPauseDurationValue] = useState(feederConfig.pauseDuration);
  const [feederSettleDurationValue, setFeederSettleDurationValue] = useState(feederConfig.settleDuration);
  const feederDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleControl = useCallback(
    (
      module: number,
      servo: "bottom" | "paddle" | "pusher",
      position: string,
    ) => {
      const key = `${module}:${servo}`;
      const current = activeRef.current[key];
      const isToggleOff = current === position;

      sendCommand(
        JSON.stringify({
          servo,
          module,
          position: isToggleOff ? "neutral" : position,
        }),
      );
      setActive((prev) => ({ ...prev, [key]: isToggleOff ? null : position }));

      const cal = configsRef.current.find(
        (c) => c.moduleNumber === module,
      )?.calibration;
      const calKey = getCalibrationKey(servo, isToggleOff ? "neutral" : position);
      if (cal && calKey) {
        const pendingValue = pendingCalibrationRef.current[module]?.[calKey];
        setSliderValues((prev) => ({
          ...prev,
          [key]: pendingValue ?? cal[calKey],
        }));
      }
    },
    [sendCommand],
  );

  const handleSliderChange = useCallback(
    (module: number, servo: "bottom" | "paddle" | "pusher", value: number) => {
      const key = `${module}:${servo}`;
      setSliderValues((prev) => ({ ...prev, [key]: value }));
      if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
      servoDebounceRef.current = setTimeout(
        () => moveServo(module, servo, value),
        CALIBRATION_PREVIEW_DEBOUNCE_MS,
      );

      const position = activeRef.current[key];
      const calKey = position ? getCalibrationKey(servo, position) : null;
      if (calKey) {
        setPendingCalibration((prev) => ({
          ...prev,
          [module]: { ...prev[module], [calKey]: value },
        }));
      }
    },
    [moveServo],
  );

  const handleServoTest = useCallback(
    (module: number, servo: "bottom" | "paddle" | "pusher") => {
      const key = `${module}:${servo}` as SliderKey;
      const cal = configsRef.current.find(
        (c) => c.moduleNumber === module,
      )?.calibration;
      if (!cal) return;
      const pending = pendingCalibrationRef.current[module];
      const valueFor = (calKey: keyof ServoCalibration) =>
        pending?.[calKey] ?? cal[calKey];

      const restKey = getCalibrationKey(
        servo,
        servo === "pusher" ? "neutral" : "closed",
      );
      if (!restKey) return;

      const steps: { calKey: keyof ServoCalibration; holdMs: number }[] =
        servo === "pusher"
          ? [
              { calKey: "pusherLeft", holdMs: SERVO_TEST_PUSHER_HOLD_MS },
              { calKey: "pusherRight", holdMs: SERVO_TEST_PUSHER_HOLD_MS },
            ]
          : [
              {
                calKey: getCalibrationKey(servo, "open")!,
                holdMs: SERVO_TEST_GATE_HOLD_MS,
              },
            ];

      const existingTimeout = servoTestTimeoutsRef.current[key];
      if (existingTimeout) clearTimeout(existingTimeout);

      const runStep = (index: number) => {
        const step = steps[index];
        if (!step) {
          moveServo(module, servo, valueFor(restKey));
          setTestingServos((prev) => ({ ...prev, [key]: false }));
          delete servoTestTimeoutsRef.current[key];
          return;
        }
        moveServo(module, servo, valueFor(step.calKey));
        servoTestTimeoutsRef.current[key] = setTimeout(
          () => runStep(index + 1),
          step.holdMs,
        );
      };

      setTestingServos((prev) => ({ ...prev, [key]: true }));
      runStep(0);
    },
    [moveServo],
  );

  const handleTest = useCallback(async () => {
    if (isUnconfigured) {
      toast.error(t("useCalibrationPage.toasts.notCalibrated"), {
        description: t("useCalibrationPage.toasts.notCalibratedDescription"),
      });
      return;
    }
    setIsTesting(true);
    toast.info(t("useCalibrationPage.toasts.runningTest"));
    const { ok, error } = await sendTest();
    setIsTesting(false);
    if (ok) {
      toast.success(t("useCalibrationPage.toasts.testComplete"));
    } else {
      toast.error(t("useCalibrationPage.toasts.testFailed"), {
        description: error ?? t("toasts.noResponse"),
      });
    }
  }, [sendTest, isUnconfigured, t]);

  const handleTestBin = useCallback(
    async (bin: number) => {
      setActiveBin(bin);
      try {
        const response = await sendRoute(resolveRoute(bin));
        if (!response) {
          toast.error(t("useCalibrationPage.toasts.binFailed", { bin }), {
            description: t("toasts.noResponse"),
          });
        } else if (typeof response === "object" && "error" in response) {
          toast.error(t("useCalibrationPage.toasts.binFailed", { bin }), {
            description: (response as { error: string }).error,
          });
        }
      } finally {
        setActiveBin(null);
      }
    },
    [sendRoute, resolveRoute, setActiveBin, t],
  );

  const handleSampleRun = useCallback(async () => {
    setIsSampleRunning(true);
    toast.info(t("useCalibrationPage.toasts.startingSampleRun"));
    try {
      const binCount = computeBinCount(moduleCount);
      for (let bin = 1; bin <= binCount; bin++) {
        setActiveBin(bin);
        const response = await sendRoute(resolveRoute(bin));
        if (!response) {
          toast.error(t("useCalibrationPage.toasts.sampleRunStopped", { bin }), {
            description: t("toasts.noResponse"),
          });
          return;
        }
        if (typeof response === "object" && "error" in response) {
          toast.error(t("useCalibrationPage.toasts.sampleRunStopped", { bin }), {
            description: (response as { error: string }).error,
          });
          return;
        }
        // Brief pause between cards so the mechanism fully resets
        await new Promise<void>((r) => setTimeout(r, CALIBRATION_STEP_SETTLE_MS));
      }
      toast.success(t("useCalibrationPage.toasts.sampleRunComplete"));
    } finally {
      setActiveBin(null);
      setIsSampleRunning(false);
    }
  }, [sendRoute, resolveRoute, moduleCount, setActiveBin, t]);

  const [pushTestingModule, setPushTestingModule] = useState<number | null>(
    null,
  );

  const handlePushTest = useCallback(
    async (module: number, direction: "left" | "right") => {
      setPushTestingModule(module);
      try {
        const response = await sendPushTest({
          module,
          direction,
          ...moduleDelayValues[module],
        });
        if (!response) {
          toast.error(t("useCalibrationPage.toasts.pushTestFailed"), {
            description: t("toasts.noResponse"),
          });
        } else if (typeof response === "object" && "error" in response) {
          const error = (response as { error: string }).error;
          toast.error(t("useCalibrationPage.toasts.pushTestFailed"), {
            description:
              error === "unknown command"
                ? t("useCalibrationPage.toasts.pushTestUnsupported")
                : error,
          });
        }
      } finally {
        setPushTestingModule(null);
      }
    },
    [sendPushTest, moduleDelayValues, t],
  );

  const handleModuleDelayChange = useCallback(
    (module: number, field: ModuleDelayField, value: number) => {
      setPendingCalibration((prev) => ({
        ...prev,
        [module]: { ...prev[module], [field]: value },
      }));
    },
    [],
  );

  const handleFeederSpeedChange = useCallback(
    (value: number) => {
      setFeederSpeedValue(value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(
        () => previewSpeed(value),
        CALIBRATION_PREVIEW_DEBOUNCE_MS,
      );
    },
    [previewSpeed],
  );

  const handleFeederDurationChange = useCallback((value: number) => {
    setFeederDurationValue(value);
  }, []);

  const handleFeederPulseDurationChange = useCallback((value: number) => {
    setFeederPulseDurationValue(value);
  }, []);

  const handleFeederPauseDurationChange = useCallback((value: number) => {
    setFeederPauseDurationValue(value);
  }, []);

  const handleFeederSettleDurationChange = useCallback((value: number) => {
    setFeederSettleDurationValue(value);
  }, []);

  const handleFeederSelectContinuous = useCallback(() => {
    setFeederPulseDurationValue(0);
  }, []);

  const isFeederDirty =
    feederSpeedValue !== feederConfig.speed ||
    feederDurationValue !== feederConfig.duration ||
    feederPulseDurationValue !== feederConfig.pulseDuration ||
    feederPauseDurationValue !== feederConfig.pauseDuration ||
    feederSettleDurationValue !== feederConfig.settleDuration;

  const dirtyModules = useMemo(
    () =>
      modules.filter(
        (m) =>
          pendingCalibration[m] &&
          Object.keys(pendingCalibration[m]).length > 0,
      ),
    [modules, pendingCalibration],
  );

  const isFeederModuleDirty = isFeederDirty || dirtyModules.length > 0;
  const isScanRegionSectionDirty =
    isScanRegionDirty ||
    isCaptureSettleDirty ||
    isMatchesNeededDirty ||
    isCheckBothOrientationsDirty;

  const [isSavingFeederModule, setIsSavingFeederModule] = useState(false);

  const handleSaveFeederModuleCalibration = useCallback(async () => {
    setIsSavingFeederModule(true);
    try {
      if (isFeederDirty) {
        await saveFeeder({
          ...feederConfig,
          speed: feederSpeedValue,
          duration: feederDurationValue,
          pulseDuration: feederPulseDurationValue,
          pauseDuration: feederPauseDurationValue,
          settleDuration: feederSettleDurationValue,
        });
      }
      for (const moduleNumber of dirtyModules) {
        const config = configsRef.current.find(
          (c) => c.moduleNumber === moduleNumber,
        );
        const calibration = config?.calibration ?? DEFAULT_CALIBRATION;
        await saveConfig(moduleNumber, {
          ...calibration,
          ...pendingCalibrationRef.current[moduleNumber],
        });
        setPendingCalibration((prev) => {
          const next = { ...prev };
          delete next[moduleNumber];
          return next;
        });
      }
      toast.success(t("useCalibrationPage.toasts.calibrationSaved"));
    } catch {
    } finally {
      setIsSavingFeederModule(false);
    }
  }, [
    isFeederDirty,
    dirtyModules,
    feederConfig,
    feederSpeedValue,
    feederDurationValue,
    feederPulseDurationValue,
    feederPauseDurationValue,
    feederSettleDurationValue,
    saveFeeder,
    saveConfig,
    t,
  ]);

  const handleDiscardFeederModuleCalibration = useCallback(() => {
    setPendingCalibration({});
    setFeederSpeedValue(feederConfig.speed);
    setFeederDurationValue(feederConfig.duration);
    setFeederPulseDurationValue(feederConfig.pulseDuration);
    setFeederPauseDurationValue(feederConfig.pauseDuration);
    setFeederSettleDurationValue(feederConfig.settleDuration);
  }, [feederConfig]);

  const [isSavingScanRegion, setIsSavingScanRegion] = useState(false);

  const handleSaveScanRegion = useCallback(async () => {
    if (!device) return;
    setIsSavingScanRegion(true);
    try {
      await saveDevice(device.guid, {
        ...(isScanRegionDirty ? { scanRegion } : {}),
        ...(isCaptureSettleDirty ? { captureSettleDelayMs } : {}),
        ...(isMatchesNeededDirty ? { matchesNeeded } : {}),
        ...(isCheckBothOrientationsDirty ? { checkBothOrientations } : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
      });
      setScanRegionDraft(null);
      setCaptureSettleDraft(null);
      setMatchesNeededDraft(null);
      setCheckBothOrientationsDraft(null);
      toast.success(t("useCalibrationPage.toasts.calibrationSaved"));
    } catch {
      toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed"));
    } finally {
      setIsSavingScanRegion(false);
    }
  }, [
    device,
    isScanRegionDirty,
    isCaptureSettleDirty,
    isMatchesNeededDirty,
    isCheckBothOrientationsDirty,
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    queryClient,
    activeOrg?.id,
    t,
  ]);

  const handleDiscardScanRegion = useCallback(() => {
    setScanRegionDraft(null);
    setCaptureSettleDraft(null);
    setMatchesNeededDraft(null);
    setCheckBothOrientationsDraft(null);
  }, []);

  const handleFeed = useCallback(() => {
    sendCommand(JSON.stringify({ feeder: true }));
  }, [sendCommand]);

  const readIR = useCallback(async () => {
    if (irBusyRef.current || activeBinRef.current !== null) return;
    irBusyRef.current = true;
    try {
      const sent = await sendCommand(JSON.stringify({ readIR: true }));
      if (!sent) return;
      const response = await receiveResponse(2000);
      if (!response) return;
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed.ir)) setIrStates(parsed.ir as boolean[]);
      if (typeof parsed.hopper === "boolean") setHopperHasCards(parsed.hopper);
    } catch {
    } finally {
      irBusyRef.current = false;
    }
  }, [sendCommand, receiveResponse]);

  const handleToggleIrMonitor = useCallback(() => {
    setIrMonitoring((prev) => !prev);
  }, []);

  const handleCopyCalibration = useCallback(async () => {
    const text = buildCalibrationDebugText({
      channelLayout,
      moduleCount,
      configs,
      feederConfig,
      binRoutes,
      firmwareVersion,
      board,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("useCalibrationPage.toasts.calibrationCopied"));
    } catch {
      toast.error(t("useCalibrationPage.toasts.copyFailed"));
    }
  }, [channelLayout, moduleCount, configs, feederConfig, binRoutes, firmwareVersion, board, t]);

  const handleExportConfig = useCallback(() => {
    downloadCalibrationExport(
      buildCalibrationExport({
        channelLayout,
        moduleCount,
        configs,
        feederConfig,
        binRoutes,
      }),
    );
  }, [channelLayout, moduleCount, configs, feederConfig, binRoutes]);

  const [isImporting, setIsImporting] = useState(false);

  const handleImportConfig = useCallback(
    async (file: File) => {
      let parsed;
      try {
        parsed = parseCalibrationExport(await file.text());
      } catch {
        toast.error(t("useCalibrationPage.toasts.importInvalid"));
        return;
      }

      if (!device) {
        toast.error(t("useCalibrationPage.toasts.importFailed"));
        return;
      }

      setIsImporting(true);
      try {
        await saveDevice(device.guid, {
          moduleCount: parsed.moduleCount,
          channelLayout: parsed.channelLayout,
        });
        await queryClient.invalidateQueries({
          queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
        });

        for (const m of parsed.modules) {
          await saveConfig(m.moduleNumber, m.calibration);
        }

        await saveFeeder(parsed.feeder);

        for (const route of parsed.binRoutes) {
          await saveBinRoute(device.guid, route);
        }
        await queryClient.invalidateQueries({
          queryKey: binRoutesQueryOptions(device.guid).queryKey,
        });

        toast.success(t("useCalibrationPage.toasts.importSuccess"));
      } catch {
        toast.error(t("useCalibrationPage.toasts.importFailed"));
      } finally {
        setIsImporting(false);
      }
    },
    [activeOrg?.id, device, queryClient, saveConfig, saveFeeder, t],
  );

  useEffect(() => {
    if (!irMonitoring || !isConnected) return;
    const id = setInterval(() => {
      void readIR();
    }, 300);
    return () => clearInterval(id);
  }, [irMonitoring, isConnected, readIR]);

  useEffect(() => {
    if (!isConnected) {
      setIrMonitoring(false);
      setIrStates(null);
      setHopperHasCards(null);
    }
  }, [isConnected]);

  return {
    isConnected,
    connect,
    connectBluetooth,
    staleDialogOpen,
    onDismissStaleDialog,
    onRunTest,
    onCalibrateFirst,
    disconnect,
    configs,
    modules,
    isLoading,
    active,
    sliderValues,
    pendingCalibration,
    moduleDelayValues,
    activeBin,
    isTesting,
    isUnconfigured,
    handleControl,
    handleSliderChange,
    testingServos,
    handleServoTest,
    handleModuleDelayChange,
    pushTestingModule,
    handlePushTest,
    handleTest,
    handleTestBin,
    feederConfig,
    feederSpeedValue,
    feederDurationValue,
    feederPulseDurationValue,
    feederPauseDurationValue,
    feederSettleDurationValue,
    handleFeederSpeedChange,
    handleFeederDurationChange,
    handleFeederPulseDurationChange,
    handleFeederPauseDurationChange,
    handleFeederSettleDurationChange,
    handleFeederSelectContinuous,
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    isDeviceLoading,
    handleScanRegionChange,
    handleResetScanRegion,
    handleCaptureSettleChange,
    handleMatchesNeededChange,
    handleCheckBothOrientationsChange,
    isFeederModuleDirty,
    isSavingFeederModule,
    handleSaveFeederModuleCalibration,
    handleDiscardFeederModuleCalibration,
    isScanRegionSectionDirty,
    isSavingScanRegion,
    handleSaveScanRegion,
    handleDiscardScanRegion,
    handleFeed,
    isSampleRunning,
    handleSampleRun,
    irStates,
    hopperHasCards,
    irMonitoring,
    handleReadIR: readIR,
    handleToggleIrMonitor,
    handleCopyCalibration,
    handleExportConfig,
    handleImportConfig,
    isImporting,
  };
}
