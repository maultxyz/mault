import {
  binRoutesQueryOptions,
  saveBinRoute,
} from "@/features/calibration/api/bin-routes";
import {
  devicesQueryOptions,
  saveDevice,
} from "@/features/calibration/api/devices";
import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import { useDevice } from "@/features/calibration/api/use-device";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useOrg } from "@/features/companies/api/use-organization";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { useOfflineCalibration } from "@/features/calibration/api/use-offline-calibration";
import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { useRetractCard } from "@/features/scanner/api/use-retract-card";
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
  FeederSpeedAnchor,
  ModuleDelayField,
  SliderKey,
  ServoName,
} from "@/lib/interfaces/calibration";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  SETUP_SERVO_POSITIONS,
} from "@/lib/constants/calibration";
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
  type FeederCalibration,
  parseSerialReply,
  recenterSpeedPulse,
  type ScanRegion,
  SERVO_PULSE_CENTER,
  type ServoCalibration,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStationToast } from "@/features/scanner/api/use-station-toast";

export function useCalibrationPage() {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const {
    isConnected,
    isReady,
    disconnect,
    sendCommand,
    sendRoute,
    sendPushTest,
    sendTest,
    sendRequest,
    firmwareVersion,
    board,
  } = useSerial();
  const { resetToNeutral } = useResetToNeutral();
  const {
    connect,
    connectBluetooth,
    connectCloud,
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
  const {
    isOffline: isOfflineCalibration,
    accept: startOfflineCalibration,
    stop: stopOfflineCalibration,
  } = useOfflineCalibration();
  const canCalibrate =
    isReady || (isConnected && isUnconfigured) || isOfflineCalibration;

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
        paddleOpenDelay: valueOf("paddleOpenDelay"),
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
  const [flipCameraDraft, setFlipCameraDraft] = useState<boolean | null>(null);
  const isFlipCameraDirty = flipCameraDraft !== null;
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
  const flipCamera = flipCameraDraft ?? device?.flipCamera ?? false;

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

  const handleFlipCameraChange = useCallback((value: boolean) => {
    setFlipCameraDraft(value);
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

  const [feederDraft, setFeederDraft] = useState<Partial<FeederCalibration>>({});
  const feederValues = useMemo<FeederCalibration>(
    () => ({ ...feederConfig, ...feederDraft }),
    [feederConfig, feederDraft],
  );
  const feederSpeedValue = feederValues.speed;
  const feederDurationValue = feederValues.duration;
  const feederPulseDurationValue = feederValues.pulseDuration;
  const feederPauseDurationValue = feederValues.pauseDuration;
  const feederSettleDurationValue = feederValues.settleDuration;
  const feederReverseSpeedValue = feederValues.reverseSpeed;
  const feederReverseDurationValue = feederValues.reverseDuration;
  const setFeederDraftField = useCallback(
    (field: keyof FeederCalibration, value: number) => {
      feederSpeedAnchorRef.current = null;
      setFeederDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );
  const feederSpeedAnchorRef = useRef<FeederSpeedAnchor | null>(null);
  const feederDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feederStopDraft, setFeederStopDraft] = useState<
    number | null | undefined
  >(undefined);
  const savedFeederStopPulse = device?.feederStopPulse ?? null;
  const feederStopPulse =
    feederStopDraft === undefined ? savedFeederStopPulse : feederStopDraft;
  const isFeederStopDirty =
    feederStopDraft !== undefined && feederStopDraft !== savedFeederStopPulse;
  const feederStateRef = useRef({ config: feederConfig, draft: feederDraft });
  feederStateRef.current = { config: feederConfig, draft: feederDraft };

  const draftsOnDeviceRef = useRef({
    modules: new Set<number>(),
    feeder: false,
  });

  const sendAndAwaitReply = useCallback(
    async (command: object) => {
      await sendRequest(command);
    },
    [sendRequest],
  );

  const applyDraftsToDevice = useCallback(async () => {
    const onDevice = draftsOnDeviceRef.current;
    for (const [key, pending] of Object.entries(pendingCalibrationRef.current)) {
      if (Object.keys(pending).length === 0) continue;
      const moduleNumber = Number(key);
      const saved =
        configsRef.current.find((c) => c.moduleNumber === moduleNumber)
          ?.calibration ?? DEFAULT_CALIBRATION;
      await sendAndAwaitReply({
        setConfig: { module: moduleNumber, ...saved, ...pending },
      });
      onDevice.modules.add(moduleNumber);
    }
    const { config, draft } = feederStateRef.current;
    const feederChanged = (
      Object.keys(draft) as (keyof FeederCalibration)[]
    ).some((field) => draft[field] !== config[field]);
    if (feederChanged) {
      await sendAndAwaitReply({ setFeederConfig: { ...config, ...draft } });
      onDevice.feeder = true;
    }
  }, [sendAndAwaitReply]);

  const restoreSavedOnDevice = useCallback(async () => {
    const onDevice = draftsOnDeviceRef.current;
    const modulesToRestore = [...onDevice.modules];
    const restoreFeeder = onDevice.feeder;
    onDevice.modules.clear();
    onDevice.feeder = false;
    for (const moduleNumber of modulesToRestore) {
      const saved =
        configsRef.current.find((c) => c.moduleNumber === moduleNumber)
          ?.calibration ?? DEFAULT_CALIBRATION;
      await sendAndAwaitReply({
        setConfig: { module: moduleNumber, ...saved },
      });
    }
    if (restoreFeeder) {
      await sendAndAwaitReply({
        setFeederConfig: feederStateRef.current.config,
      });
    }
  }, [sendAndAwaitReply]);

  const restoreSavedOnDeviceRef = useRef(restoreSavedOnDevice);
  restoreSavedOnDeviceRef.current = restoreSavedOnDevice;

  useEffect(
    () => () => {
      void restoreSavedOnDeviceRef.current();
    },
    [],
  );

  useEffect(() => {
    if (isConnected) return;
    draftsOnDeviceRef.current.modules.clear();
    draftsOnDeviceRef.current.feeder = false;
  }, [isConnected]);

  const handleControl = useCallback(
    (
      module: number,
      servo: ServoName,
      position: string,
    ) => {
      if (!canCalibrate) return;
      const key = `${module}:${servo}`;
      const current = activeRef.current[key];
      const isToggleOff = current === position;
      const targetPosition = isToggleOff ? "neutral" : position;

      const cal = configsRef.current.find(
        (c) => c.moduleNumber === module,
      )?.calibration;
      const calKey = getCalibrationKey(servo, targetPosition);
      const pendingValue = calKey
        ? pendingCalibrationRef.current[module]?.[calKey]
        : undefined;

      if (pendingValue !== undefined) {
        moveServo(module, servo, pendingValue);
      } else {
        sendCommand(
          JSON.stringify({ servo, module, position: targetPosition }),
        );
      }
      setActive((prev) => ({ ...prev, [key]: isToggleOff ? null : position }));

      if (cal && calKey) {
        setSliderValues((prev) => ({
          ...prev,
          [key]: pendingValue ?? cal[calKey],
        }));
      }
    },
    [canCalibrate, sendCommand, moveServo],
  );

  const handleSliderChange = useCallback(
    (module: number, servo: ServoName, value: number) => {
      if (!canCalibrate) return;
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
    [canCalibrate, moveServo],
  );

  const handleServoTest = useCallback(
    (module: number, servo: ServoName) => {
      if (!canCalibrate || !isConnected) return;
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
    [canCalibrate, isConnected, moveServo],
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
    await applyDraftsToDevice();
    const { ok, error } = await sendTest();
    setIsTesting(false);
    if (ok) {
      toast.success(t("useCalibrationPage.toasts.testComplete"));
    } else {
      toast.error(t("useCalibrationPage.toasts.testFailed"), {
        description: error ?? t("toasts.noResponse"),
      });
    }
  }, [toast, sendTest, isUnconfigured, applyDraftsToDevice, t]);

  const handleTestBin = useCallback(
    async (bin: number) => {
      if (!isReady) return;
      setActiveBin(bin);
      try {
        await applyDraftsToDevice();
        if (!(await resetToNeutral())) return;
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
    [
      toast,
      isReady,
      sendRoute,
      resolveRoute,
      setActiveBin,
      applyDraftsToDevice,
      resetToNeutral,
      t,
    ],
  );

  const handleSampleRun = useCallback(async () => {
    if (!isReady) return;
    setIsSampleRunning(true);
    toast.info(t("useCalibrationPage.toasts.startingSampleRun"));
    try {
      await applyDraftsToDevice();
      if (!(await resetToNeutral())) return;
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
        await new Promise<void>((r) => setTimeout(r, CALIBRATION_STEP_SETTLE_MS));
      }
      toast.success(t("useCalibrationPage.toasts.sampleRunComplete"));
    } finally {
      setActiveBin(null);
      setIsSampleRunning(false);
    }
  }, [
    toast,
    isReady,
    sendRoute,
    resolveRoute,
    moduleCount,
    setActiveBin,
    applyDraftsToDevice,
    resetToNeutral,
    t,
  ]);

  const [pushTestingModule, setPushTestingModule] = useState<number | null>(
    null,
  );

  const handlePushTest = useCallback(
    async (module: number, direction: "left" | "right") => {
      if (!isReady) return;
      setPushTestingModule(module);
      try {
        await applyDraftsToDevice();
        if (!(await resetToNeutral())) return;
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
    [
      toast,
      isReady,
      sendPushTest,
      moduleDelayValues,
      applyDraftsToDevice,
      resetToNeutral,
      t,
    ],
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
      if (!canCalibrate) return;
      setFeederDraftField("speed", value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(
        () => previewSpeed(value),
        CALIBRATION_PREVIEW_DEBOUNCE_MS,
      );
    },
    [canCalibrate, previewSpeed, setFeederDraftField],
  );

  const moveFeederStopPulse = useCallback(
    (value: number | null) => {
      const { config, draft } = feederStateRef.current;
      const current = { ...config, ...draft };
      const anchor = feederSpeedAnchorRef.current ?? {
        center: feederStopPulse ?? SERVO_PULSE_CENTER,
        speed: current.speed,
        reverseSpeed: current.reverseSpeed,
      };
      feederSpeedAnchorRef.current = anchor;
      const toCenter = value ?? SERVO_PULSE_CENTER;
      setFeederDraft((prev) => ({
        ...prev,
        speed: recenterSpeedPulse(anchor.speed, anchor.center, toCenter),
        reverseSpeed: recenterSpeedPulse(
          anchor.reverseSpeed,
          anchor.center,
          toCenter,
        ),
      }));
      setFeederStopDraft(value);
    },
    [feederStopPulse],
  );

  const handleFeederStopPulseChange = useCallback(
    (value: number) => {
      if (!canCalibrate) return;
      moveFeederStopPulse(value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(
        () => previewSpeed(value),
        CALIBRATION_PREVIEW_DEBOUNCE_MS,
      );
    },
    [canCalibrate, previewSpeed, moveFeederStopPulse],
  );

  const handleResetFeederStopPulse = useCallback(
    () => moveFeederStopPulse(null),
    [moveFeederStopPulse],
  );

  const handleFeederDurationChange = useCallback(
    (value: number) => setFeederDraftField("duration", value),
    [setFeederDraftField],
  );

  const handleFeederPulseDurationChange = useCallback(
    (value: number) => setFeederDraftField("pulseDuration", value),
    [setFeederDraftField],
  );

  const handleFeederPauseDurationChange = useCallback(
    (value: number) => setFeederDraftField("pauseDuration", value),
    [setFeederDraftField],
  );

  const handleFeederSettleDurationChange = useCallback(
    (value: number) => setFeederDraftField("settleDuration", value),
    [setFeederDraftField],
  );

  const handleFeederReverseSpeedChange = useCallback(
    (value: number) => {
      if (!canCalibrate) return;
      setFeederDraftField("reverseSpeed", value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(
        () => previewSpeed(value),
        CALIBRATION_PREVIEW_DEBOUNCE_MS,
      );
    },
    [canCalibrate, previewSpeed, setFeederDraftField],
  );

  const handleFeederReverseDurationChange = useCallback(
    (value: number) => setFeederDraftField("reverseDuration", value),
    [setFeederDraftField],
  );

  const handleFeederSelectContinuous = useCallback(
    () => setFeederDraftField("pulseDuration", 0),
    [setFeederDraftField],
  );

  const isFeederDirty = (
    Object.keys(feederDraft) as (keyof FeederCalibration)[]
  ).some((field) => feederDraft[field] !== feederConfig[field]);

  const dirtyModules = useMemo(
    () =>
      modules.filter(
        (m) =>
          pendingCalibration[m] &&
          Object.keys(pendingCalibration[m]).length > 0,
      ),
    [modules, pendingCalibration],
  );

  const isFeederModuleDirty =
    isFeederDirty || isFeederStopDirty || dirtyModules.length > 0;
  const isScanRegionSectionDirty =
    isScanRegionDirty ||
    isCaptureSettleDirty ||
    isMatchesNeededDirty ||
    isCheckBothOrientationsDirty ||
    isFlipCameraDirty;

  const [isSavingFeederModule, setIsSavingFeederModule] = useState(false);

  const handleSaveFeederModuleCalibration = useCallback(async () => {
    setIsSavingFeederModule(true);
    try {
      if (isFeederDirty) {
        await saveFeeder(feederValues);
        draftsOnDeviceRef.current.feeder = false;
        setFeederDraft({});
      }
      if (isFeederStopDirty && device) {
        await saveDevice(device.guid, { feederStopPulse });
        await queryClient.invalidateQueries({
          queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
        });
        setFeederStopDraft(undefined);
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
        draftsOnDeviceRef.current.modules.delete(moduleNumber);
        setPendingCalibration((prev) => {
          const next = { ...prev };
          delete next[moduleNumber];
          return next;
        });
      }
      toast.success(t("useCalibrationPage.toasts.calibrationSaved"));
    } catch {} finally {
      setIsSavingFeederModule(false);
    }
  }, [
    toast,
    isFeederDirty,
    isFeederStopDirty,
    feederStopPulse,
    device,
    queryClient,
    activeOrg?.id,
    dirtyModules,
    feederValues,
    saveFeeder,
    saveConfig,
    t,
  ]);

  const handleResetServosToDefaults = useCallback(() => {
    setPendingCalibration((prev) => {
      const next = { ...prev };
      for (const m of modules) {
        const saved =
          configsRef.current.find((c) => c.moduleNumber === m)?.calibration ??
          DEFAULT_CALIBRATION;
        const pending: Partial<ServoCalibration> = { ...prev[m] };
        for (const { calKey } of SETUP_SERVO_POSITIONS) {
          if (saved[calKey] === DEFAULT_CALIBRATION[calKey]) {
            delete pending[calKey];
          } else {
            pending[calKey] = DEFAULT_CALIBRATION[calKey];
          }
        }
        if (Object.keys(pending).length > 0) next[m] = pending;
        else delete next[m];
      }
      return next;
    });
    setSliderValues((prev) => {
      const next = { ...prev };
      for (const [key, position] of Object.entries(activeRef.current)) {
        if (!position) continue;
        const servo = key.split(":")[1] as ServoName;
        const calKey = getCalibrationKey(servo, position);
        if (calKey) next[key as SliderKey] = DEFAULT_CALIBRATION[calKey];
      }
      return next;
    });
  }, [modules]);

  const handleDiscardFeederModuleCalibration = useCallback(() => {
    setPendingCalibration({});
    feederSpeedAnchorRef.current = null;
    setFeederDraft({});
    setFeederStopDraft(undefined);
    void restoreSavedOnDevice();
  }, [restoreSavedOnDevice]);

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
        ...(isFlipCameraDirty ? { flipCamera } : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
      });
      setScanRegionDraft(null);
      setCaptureSettleDraft(null);
      setMatchesNeededDraft(null);
      setCheckBothOrientationsDraft(null);
      setFlipCameraDraft(null);
      toast.success(t("useCalibrationPage.toasts.calibrationSaved"));
    } catch {
      toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed"));
    } finally {
      setIsSavingScanRegion(false);
    }
  }, [
    toast,
    device,
    isScanRegionDirty,
    isCaptureSettleDirty,
    isMatchesNeededDirty,
    isCheckBothOrientationsDirty,
    isFlipCameraDirty,
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    flipCamera,
    queryClient,
    activeOrg?.id,
    t,
  ]);

  const handleDiscardScanRegion = useCallback(() => {
    setScanRegionDraft(null);
    setCaptureSettleDraft(null);
    setMatchesNeededDraft(null);
    setCheckBothOrientationsDraft(null);
    setFlipCameraDraft(null);
  }, []);

  const handleFeed = useCallback(async () => {
    if (!isReady) return;
    await applyDraftsToDevice();
    sendCommand(JSON.stringify({ feeder: true }));
  }, [isReady, sendCommand, applyDraftsToDevice]);

  const handleDropCard = useCallback(() => {
    if (!isReady) return;
    sendCommand(JSON.stringify({ clearDevice: true }));
  }, [isReady, sendCommand]);

  const { retractCard, isRetracting, retractLockedReason } = useRetractCard();
  const handleRetractCard = useCallback(async () => {
    if (!isReady) return;
    await applyDraftsToDevice();
    await retractCard();
  }, [isReady, applyDraftsToDevice, retractCard]);

  const readIR = useCallback(async () => {
    if (!isReady || irBusyRef.current || activeBinRef.current !== null) return;
    irBusyRef.current = true;
    try {
      const { line: response } = await sendRequest({ readIR: true }, 2000);
      const parsed = parseSerialReply(response);
      if (!parsed) return;
      if (Array.isArray(parsed.ir)) setIrStates(parsed.ir as boolean[]);
      if (typeof parsed.hopper === "boolean") setHopperHasCards(parsed.hopper);
    } catch {} finally {
      irBusyRef.current = false;
    }
  }, [isReady, sendRequest]);

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
  }, [toast, channelLayout, moduleCount, configs, feederConfig, binRoutes, firmwareVersion, board, t]);

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
    [toast, activeOrg?.id, device, queryClient, saveConfig, saveFeeder, t],
  );

  useEffect(() => {
    if (!irMonitoring || !isReady) return;
    const id = setInterval(() => {
      void readIR();
    }, 300);
    return () => clearInterval(id);
  }, [irMonitoring, isReady, readIR]);

  useEffect(() => {
    if (!isConnected) {
      setIrMonitoring(false);
      setIrStates(null);
      setHopperHasCards(null);
    }
  }, [isConnected]);

  return {
    isConnected,
    isReady,
    canCalibrate,
    isOfflineCalibration,
    startOfflineCalibration,
    stopOfflineCalibration,
    connect,
    connectBluetooth,
    connectCloud,
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
    feederReverseSpeedValue,
    feederReverseDurationValue,
    feederStopPulse,
    handleFeederSpeedChange,
    handleFeederStopPulseChange,
    handleResetFeederStopPulse,
    handleFeederDurationChange,
    handleFeederPulseDurationChange,
    handleFeederPauseDurationChange,
    handleFeederSettleDurationChange,
    handleFeederReverseSpeedChange,
    handleFeederReverseDurationChange,
    handleFeederSelectContinuous,
    scanRegion,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    flipCamera,
    isDeviceLoading,
    handleScanRegionChange,
    handleResetScanRegion,
    handleCaptureSettleChange,
    handleMatchesNeededChange,
    handleCheckBothOrientationsChange,
    handleFlipCameraChange,
    isFeederModuleDirty,
    isSavingFeederModule,
    handleSaveFeederModuleCalibration,
    handleDiscardFeederModuleCalibration,
    handleResetServosToDefaults,
    isScanRegionSectionDirty,
    isSavingScanRegion,
    handleSaveScanRegion,
    handleDiscardScanRegion,
    handleFeed,
    handleDropCard,
    handleRetractCard,
    isRetracting,
    retractLockedReason,
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
