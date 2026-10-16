import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CALIBRATION,
  DEFAULT_FEEDER_CALIBRATION,
  DEFAULT_MODULE_COUNT,
  type FeederCalibration,
  type ServoCalibration,
} from "@magic-vault/shared";
import {
  feederConfigQueryOptions,
  moduleConfigsQueryOptions,
  saveFeederConfig,
  saveModuleConfig,
} from "@/features/calibration/api/calibration-configs";
import { getCalibrationKey } from "@/features/calibration/lib/calibration-keys";
import { useSorter } from "@/features/sorter/api/use-sorter";
import {
  CALIBRATION_PREVIEW_DEBOUNCE_MS,
  FEEDER_PREVIEW_STOP_MS,
  PUSH_TEST_RESPONSE_TIMEOUT_MS,
  SERVO_TEST_GATE_HOLD_MS,
  SERVO_TEST_PUSHER_HOLD_MS,
  SETUP_SERVO_POSITIONS,
} from "@/lib/constants/calibration";
import { BUSY_PHASES } from "@/lib/constants/sorter";
import type {
  ActivePositions,
  CalibrationState,
  ModuleDelayField,
  ServoName,
  SliderKey,
} from "@/lib/interfaces/calibration";

export function useCalibration(): CalibrationState {
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const deviceGuid = sorter.device?.guid ?? null;
  const moduleCount = sorter.device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const modules = useMemo(() => Array.from({ length: moduleCount }, (_, i) => i + 1), [moduleCount]);
  const modulesQuery = useQuery(moduleConfigsQueryOptions(deviceGuid));
  const feederQuery = useQuery(feederConfigQueryOptions(deviceGuid));
  const configs = useMemo(() => modulesQuery.data ?? [], [modulesQuery.data]);
  const feederConfig = feederQuery.data ?? DEFAULT_FEEDER_CALIBRATION;

  const busy = (BUSY_PHASES as readonly string[]).includes(sorter.phase);
  const canCalibrate = sorter.isConnected && !busy;

  const [active, setActive] = useState<ActivePositions>({});
  const [sliderValues, setSliderValues] = useState<Partial<Record<SliderKey, number>>>({});
  const [pendingCalibration, setPendingCalibration] = useState<Record<number, Partial<ServoCalibration>>>({});
  const [feederDraft, setFeederDraft] = useState<Partial<FeederCalibration>>({});
  const [testingServos, setTestingServos] = useState<Partial<Record<SliderKey, boolean>>>({});
  const [pushTestingModule, setPushTestingModule] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const latest = useRef({ active, configs, pendingCalibration, feederConfig, feederDraft, canCalibrate, sorter });
  latest.current = { active, configs, pendingCalibration, feederConfig, feederDraft, canCalibrate, sorter };
  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feederDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feederStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servoTestTimeoutsRef = useRef<Partial<Record<SliderKey, ReturnType<typeof setTimeout>>>>({});
  const draftsOnDeviceRef = useRef({ modules: new Set<number>(), feeder: false });

  const savedFor = (module: number): ServoCalibration =>
    latest.current.configs.find((c) => c.moduleNumber === module)?.calibration ?? DEFAULT_CALIBRATION;

  const isUnconfigured =
    configs.length > 0 &&
    configs.every((c) =>
      (Object.keys(DEFAULT_CALIBRATION) as (keyof ServoCalibration)[]).every(
        (key) => c.calibration[key] === DEFAULT_CALIBRATION[key],
      ),
    );

  const moduleDelayValues = useMemo(() => {
    const values: Record<number, Record<ModuleDelayField, number>> = {};
    for (const m of modules) {
      const saved = configs.find((c) => c.moduleNumber === m)?.calibration;
      const valueOf = (field: ModuleDelayField) =>
        pendingCalibration[m]?.[field] ?? saved?.[field] ?? DEFAULT_CALIBRATION[field];
      values[m] = {
        paddleOpenDelay: valueOf("paddleOpenDelay"),
        pusherHoldDuration: valueOf("pusherHoldDuration"),
        paddleCloseDelay: valueOf("paddleCloseDelay"),
      };
    }
    return values;
  }, [modules, configs, pendingCalibration]);

  const feederValues = useMemo<FeederCalibration>(() => ({ ...feederConfig, ...feederDraft }), [feederConfig, feederDraft]);
  const isFeederDirty = (Object.keys(feederDraft) as (keyof FeederCalibration)[]).some(
    (field) => feederDraft[field] !== feederConfig[field],
  );
  const dirtyModules = modules.filter((m) => pendingCalibration[m] && Object.keys(pendingCalibration[m]).length > 0);
  const isDirty = isFeederDirty || dirtyModules.length > 0;

  const moveServo = useCallback((module: number, servo: ServoName, value: number) => {
    latest.current.sorter.sendCommand({ servo, module, value });
  }, []);

  const applyDraftsToDevice = useCallback(async () => {
    const { sorter: s, pendingCalibration: pending, feederConfig: feeder, feederDraft: draft } = latest.current;
    for (const [key, changes] of Object.entries(pending)) {
      if (Object.keys(changes).length === 0) continue;
      const module = Number(key);
      await s.sendRequest({ setConfig: { module, ...savedFor(module), ...changes } });
      draftsOnDeviceRef.current.modules.add(module);
    }
    const feederChanged = (Object.keys(draft) as (keyof FeederCalibration)[]).some((f) => draft[f] !== feeder[f]);
    if (feederChanged) {
      await s.sendRequest({ setFeederConfig: { ...feeder, ...draft } });
      draftsOnDeviceRef.current.feeder = true;
    }
  }, []);

  const restoreSavedOnDevice = useCallback(async () => {
    const onDevice = draftsOnDeviceRef.current;
    const toRestore = [...onDevice.modules];
    const restoreFeeder = onDevice.feeder;
    onDevice.modules.clear();
    onDevice.feeder = false;
    const s = latest.current.sorter;
    if (!s.isConnected) return;
    for (const module of toRestore) {
      await s.sendRequest({ setConfig: { module, ...savedFor(module) } });
    }
    if (restoreFeeder) await s.sendRequest({ setFeederConfig: latest.current.feederConfig });
  }, []);

  useEffect(() => {
    const timeouts = servoTestTimeoutsRef.current;
    return () => {
      for (const timeout of Object.values(timeouts)) clearTimeout(timeout);
      if (feederStopRef.current) clearTimeout(feederStopRef.current);
      void restoreSavedOnDevice();
    };
  }, [restoreSavedOnDevice]);

  useEffect(() => {
    if (sorter.isConnected) return;
    draftsOnDeviceRef.current.modules.clear();
    draftsOnDeviceRef.current.feeder = false;
  }, [sorter.isConnected]);

  const handleControl = useCallback(
    (module: number, servo: ServoName, position: string) => {
      if (!latest.current.canCalibrate) return;
      const key: SliderKey = `${module}:${servo}`;
      const isToggleOff = latest.current.active[key] === position;
      const target = isToggleOff ? "neutral" : position;
      const calKey = getCalibrationKey(servo, target);
      const pendingValue = calKey ? latest.current.pendingCalibration[module]?.[calKey] : undefined;
      if (pendingValue !== undefined) moveServo(module, servo, pendingValue);
      else latest.current.sorter.sendCommand({ servo, module, position: target });
      setActive((prev) => ({ ...prev, [key]: isToggleOff ? null : position }));
      if (calKey) setSliderValues((prev) => ({ ...prev, [key]: pendingValue ?? savedFor(module)[calKey] }));
    },
    [moveServo],
  );

  const handleSliderChange = useCallback(
    (module: number, servo: ServoName, value: number) => {
      if (!latest.current.canCalibrate) return;
      const key: SliderKey = `${module}:${servo}`;
      setSliderValues((prev) => ({ ...prev, [key]: value }));
      if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
      servoDebounceRef.current = setTimeout(() => moveServo(module, servo, value), CALIBRATION_PREVIEW_DEBOUNCE_MS);
      const position = latest.current.active[key];
      const calKey = position ? getCalibrationKey(servo, position) : null;
      if (calKey) {
        setPendingCalibration((prev) => ({ ...prev, [module]: { ...prev[module], [calKey]: value } }));
      }
    },
    [moveServo],
  );

  const handleServoTest = useCallback(
    (module: number, servo: ServoName) => {
      if (!latest.current.canCalibrate) return;
      const key: SliderKey = `${module}:${servo}`;
      const pending = latest.current.pendingCalibration[module];
      const valueFor = (calKey: keyof ServoCalibration) => pending?.[calKey] ?? savedFor(module)[calKey];
      const restKey = getCalibrationKey(servo, servo === "pusher" ? "neutral" : "closed");
      const openKey = getCalibrationKey(servo, "open");
      if (!restKey) return;
      const steps: { calKey: keyof ServoCalibration; holdMs: number }[] =
        servo === "pusher"
          ? [
              { calKey: "pusherLeft", holdMs: SERVO_TEST_PUSHER_HOLD_MS },
              { calKey: "pusherRight", holdMs: SERVO_TEST_PUSHER_HOLD_MS },
            ]
          : openKey
            ? [{ calKey: openKey, holdMs: SERVO_TEST_GATE_HOLD_MS }]
            : [];
      const existing = servoTestTimeoutsRef.current[key];
      if (existing) clearTimeout(existing);
      const runStep = (index: number) => {
        const step = steps[index];
        if (!step) {
          moveServo(module, servo, valueFor(restKey));
          setTestingServos((prev) => ({ ...prev, [key]: false }));
          delete servoTestTimeoutsRef.current[key];
          return;
        }
        moveServo(module, servo, valueFor(step.calKey));
        servoTestTimeoutsRef.current[key] = setTimeout(() => runStep(index + 1), step.holdMs);
      };
      setTestingServos((prev) => ({ ...prev, [key]: true }));
      runStep(0);
    },
    [moveServo],
  );

  const handlePushTest = useCallback(
    async (module: number, direction: "left" | "right") => {
      const s = latest.current.sorter;
      if (!s.isReady) return;
      setPushTestingModule(module);
      try {
        await applyDraftsToDevice();
        if (!(await s.sendNeutral())) return;
        await s.sendRequest({ pushTest: { module, direction, ...moduleDelayValues[module] } }, PUSH_TEST_RESPONSE_TIMEOUT_MS);
      } finally {
        setPushTestingModule(null);
      }
    },
    [applyDraftsToDevice, moduleDelayValues],
  );

  const handleModuleDelayChange = useCallback((module: number, field: ModuleDelayField, value: number) => {
    setPendingCalibration((prev) => ({ ...prev, [module]: { ...prev[module], [field]: value } }));
  }, []);

  const previewFeederSpeed = useCallback((value: number) => {
    const s = latest.current.sorter;
    s.sendCommand({ feederValue: value });
    if (feederStopRef.current) clearTimeout(feederStopRef.current);
    feederStopRef.current = setTimeout(() => s.sendCommand({ feederStop: true }), FEEDER_PREVIEW_STOP_MS);
  }, []);

  const handleFeederChange = useCallback(
    (field: keyof FeederCalibration, value: number) => {
      setFeederDraft((prev) => ({ ...prev, [field]: value }));
      if ((field === "speed" || field === "reverseSpeed") && latest.current.canCalibrate) {
        if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
        feederDebounceRef.current = setTimeout(() => previewFeederSpeed(value), CALIBRATION_PREVIEW_DEBOUNCE_MS);
      }
    },
    [previewFeederSpeed],
  );

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    try {
      await applyDraftsToDevice();
      await latest.current.sorter.runSelfTest();
    } finally {
      setIsTesting(false);
    }
  }, [applyDraftsToDevice]);

  const handleFeed = useCallback(async () => {
    if (!latest.current.sorter.isReady) return;
    await applyDraftsToDevice();
    await latest.current.sorter.feed();
  }, [applyDraftsToDevice]);

  const handleDropCard = useCallback(() => {
    void latest.current.sorter.clearDevice();
  }, []);

  const handleResetServosToDefaults = useCallback(() => {
    setPendingCalibration((prev) => {
      const next = { ...prev };
      for (const m of modules) {
        const saved = savedFor(m);
        const pending: Partial<ServoCalibration> = { ...prev[m] };
        for (const { calKey } of SETUP_SERVO_POSITIONS) {
          if (saved[calKey] === DEFAULT_CALIBRATION[calKey]) delete pending[calKey];
          else pending[calKey] = DEFAULT_CALIBRATION[calKey];
        }
        if (Object.keys(pending).length > 0) next[m] = pending;
        else delete next[m];
      }
      return next;
    });
    setSliderValues((prev) => {
      const next = { ...prev };
      for (const [key, position] of Object.entries(latest.current.active)) {
        if (!position) continue;
        const servo = key.split(":")[1] as ServoName;
        const calKey = getCalibrationKey(servo, position);
        if (calKey) next[key as SliderKey] = DEFAULT_CALIBRATION[calKey];
      }
      return next;
    });
  }, [modules]);

  const save = useCallback(async () => {
    if (!deviceGuid) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      if (isFeederDirty) {
        const saved = await saveFeederConfig(deviceGuid, feederValues);
        queryClient.setQueryData(feederConfigQueryOptions(deviceGuid).queryKey, saved);
        draftsOnDeviceRef.current.feeder = false;
        setFeederDraft({});
      }
      for (const module of dirtyModules) {
        const next = await saveModuleConfig(deviceGuid, module, {
          ...savedFor(module),
          ...latest.current.pendingCalibration[module],
        });
        queryClient.setQueryData(moduleConfigsQueryOptions(deviceGuid).queryKey, next);
        draftsOnDeviceRef.current.modules.delete(module);
      }
      setPendingCalibration({});
      await latest.current.sorter.applySavedCalibration();
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [deviceGuid, dirtyModules, feederValues, isFeederDirty, queryClient]);

  const discard = useCallback(() => {
    setPendingCalibration({});
    setFeederDraft({});
    setSliderValues({});
    setActive({});
    void restoreSavedOnDevice();
  }, [restoreSavedOnDevice]);

  return {
    modules,
    configs,
    isLoading: modulesQuery.isPending || feederQuery.isPending,
    canCalibrate,
    isReady: sorter.isReady,
    active,
    sliderValues,
    pendingCalibration,
    moduleDelayValues,
    testingServos,
    pushTestingModule,
    isTesting,
    isUnconfigured,
    feederValues,
    isDirty,
    isSaving,
    saveError,
    handleControl,
    handleSliderChange,
    handleServoTest,
    handlePushTest,
    handleModuleDelayChange,
    handleFeederChange,
    handleTest,
    handleFeed,
    handleDropCard,
    handleResetServosToDefaults,
    save,
    discard,
  };
}

