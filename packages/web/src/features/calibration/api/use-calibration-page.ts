import { modulesQueryOptions } from "@/features/calibration/api/module-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useOrg } from "@/features/companies/api/use-organization";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import {
  defaultSliderValues,
  getCalibrationKey,
} from "@/features/calibration/lib/calibration-utils";
import type { ActivePositions, SliderKey } from "@/features/calibration/types";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  computeBinCount,
  DEFAULT_CALIBRATION,
  type BinRoute,
  type ServoCalibration,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useCalibrationPage() {
  const { t } = useTranslation("calibration");
  const { isConnected, connect, disconnect, sendCommand, sendRoute, sendTest, receiveResponse } =
    useSerial();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const { feederConfig, saveConfig: saveFeeder, previewSpeed } = useFeederConfig();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({ ...modulesQueryOptions, enabled: !!activeOrg });
  const moduleCount = useModuleCount();
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const { routes: binRoutes } = useBinRoutes();

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

  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (cal) {
        const calKey = getCalibrationKey(servo, isToggleOff ? "neutral" : position);
        if (calKey) {
          setSliderValues((prev) => ({ ...prev, [key]: cal[calKey] }));
        }
      }
    },
    [sendCommand],
  );

  const handleSliderChange = useCallback(
    (module: number, servo: "bottom" | "paddle" | "pusher", value: number) => {
      setSliderValues((prev) => ({ ...prev, [`${module}:${servo}`]: value }));
      if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
      servoDebounceRef.current = setTimeout(() => moveServo(module, servo, value), 30);
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
        description: error ?? t("useCalibrationPage.toasts.noResponse"),
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
            description: t("useCalibrationPage.toasts.noResponse"),
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
            description: t("useCalibrationPage.toasts.noResponse"),
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
        await new Promise<void>((r) => setTimeout(r, 500));
      }
      toast.success(t("useCalibrationPage.toasts.sampleRunComplete"));
    } finally {
      setActiveBin(null);
      setIsSampleRunning(false);
    }
  }, [sendRoute, resolveRoute, moduleCount, setActiveBin, t]);

  const handleSetPosition = useCallback(
    (module: number, posKey: keyof ServoCalibration, value: number) => {
      const config = configsRef.current.find((c) => c.moduleNumber === module);
      const calibration = config?.calibration ?? DEFAULT_CALIBRATION;
      saveConfig(module, { ...calibration, [posKey]: value });
    },
    [saveConfig],
  );

  const handleFeederSpeedChange = useCallback(
    (value: number) => {
      setFeederSpeedValue(value);
      if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
      feederDebounceRef.current = setTimeout(() => previewSpeed(value), 30);
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

  const handleFeederSetSpeed = useCallback(() => {
    saveFeeder({ ...feederConfig, speed: feederSpeedValue });
  }, [feederConfig, feederSpeedValue, saveFeeder]);

  const handleFeederSetDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, duration: feederDurationValue });
  }, [feederConfig, feederDurationValue, saveFeeder]);

  const handleFeederSetPulseDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, pulseDuration: feederPulseDurationValue });
  }, [feederConfig, feederPulseDurationValue, saveFeeder]);

  const handleFeederSetContinuous = useCallback(() => {
    setFeederPulseDurationValue(0);
    saveFeeder({ ...feederConfig, pulseDuration: 0 });
  }, [feederConfig, saveFeeder]);

  const handleFeederSetPauseDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, pauseDuration: feederPauseDurationValue });
  }, [feederConfig, feederPauseDurationValue, saveFeeder]);

  const handleFeederSetSettleDuration = useCallback(() => {
    saveFeeder({ ...feederConfig, settleDuration: feederSettleDurationValue });
  }, [feederConfig, feederSettleDurationValue, saveFeeder]);

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
    disconnect,
    configs,
    modules,
    isLoading,
    active,
    sliderValues,
    activeBin,
    isTesting,
    isUnconfigured,
    handleControl,
    handleSliderChange,
    handleTest,
    handleTestBin,
    handleSetPosition,
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
    handleFeederSetSpeed,
    handleFeederSetDuration,
    handleFeederSetPulseDuration,
    handleFeederSetContinuous,
    handleFeederSetPauseDuration,
    handleFeederSetSettleDuration,
    handleFeed,
    isSampleRunning,
    handleSampleRun,
    irStates,
    hopperHasCards,
    irMonitoring,
    handleReadIR: readIR,
    handleToggleIrMonitor,
  };
}
