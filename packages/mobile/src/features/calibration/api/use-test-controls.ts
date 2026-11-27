import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  computeBinCount,
  createDefaultBinRoutes,
  DEFAULT_FEEDER_CALIBRATION,
  DEFAULT_MODULE_COUNT,
  isEmergencyStopReply,
  isFirmwareFeatureSupported,
  type BinRoute,
  type SerialReply,
} from "@magic-vault/shared";
import { feederConfigQueryOptions } from "@/features/calibration/api/calibration-configs";
import { useFeederTest } from "@/features/calibration/api/use-feeder-test";
import { binRoutesQueryOptions } from "@/features/devices/api/devices";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { CALIBRATION_STEP_SETTLE_MS, IR_MONITOR_INTERVAL_MS, IR_READ_TIMEOUT_MS } from "@/lib/constants/calibration";
import type { CalibrationEmergencyStopDetail, IrReading, TestControls } from "@/lib/interfaces/calibration";

function routeFailure(response: unknown): string | null {
  if (!response) return "";
  if (typeof response === "object" && response !== null && "error" in response) {
    return String((response as SerialReply).error);
  }
  return null;
}

export function useTestControls(): TestControls {
  const { t } = useTranslation();
  const sorter = useSorter();
  const moduleCount = sorter.device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);
  const binCount = computeBinCount(moduleCount);
  const { data: routes } = useQuery(binRoutesQueryOptions(sorter.device?.guid ?? null));
  const { data: feederConfig } = useQuery(feederConfigQueryOptions(sorter.device?.guid ?? null));
  const feederTest = useFeederTest({
    moduleCount,
    feedRetryCount: (feederConfig ?? DEFAULT_FEEDER_CALIBRATION).feedRetryCount,
  });
  const [irStates, setIrStates] = useState<boolean[] | null>(null);
  const [hopperHasCards, setHopperHasCards] = useState<boolean | null>(null);
  const [irMonitoring, setIrMonitoring] = useState(false);
  const [activeBin, setActiveBin] = useState<number | null>(null);
  const [isSampleRunning, setIsSampleRunning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [irError, setIrError] = useState<string | null>(null);
  const [emergencyStopDetail, setEmergencyStopDetail] = useState<CalibrationEmergencyStopDetail | null>(null);
  const [isResettingEmergencyStop, setIsResettingEmergencyStop] = useState(false);
  const irBusyRef = useRef(false);
  const activeBinRef = useRef<number | null>(null);
  const emergencyStopRequestedRef = useRef(false);
  const canEmergencyStop = isFirmwareFeatureSupported(sorter.firmwareVersion, "emergencyStop");

  const resolveRoute = useCallback(
    (bin: number): BinRoute =>
      (routes ?? createDefaultBinRoutes(moduleCount)).find((r) => r.binNumber === bin) ?? {
        binNumber: bin,
        module: moduleCount,
        direction: "bottom",
      },
    [routes, moduleCount],
  );

  const readIr = useCallback(async () => {
    if (!sorter.isReady || irBusyRef.current || activeBinRef.current !== null) return;
    irBusyRef.current = true;
    try {
      const { line } = await sorter.sendRequest({ readIR: true }, IR_READ_TIMEOUT_MS);
      if (!line) {
        setIrError(t("calibration.ir.noReply"));
        return;
      }
      const parsed = JSON.parse(line) as IrReading;
      setIrError(null);
      if (Array.isArray(parsed.ir)) setIrStates(parsed.ir as boolean[]);
      if (typeof parsed.hopper === "boolean") setHopperHasCards(parsed.hopper);
    } catch {
      setIrError(t("calibration.ir.noReply"));
    } finally {
      irBusyRef.current = false;
    }
  }, [sorter, t]);

  useEffect(() => {
    if (!irMonitoring || !sorter.isReady) return;
    const id = setInterval(() => void readIr(), IR_MONITOR_INTERVAL_MS);
    return () => clearInterval(id);
  }, [irMonitoring, sorter.isReady, readIr]);

  useEffect(() => {
    if (sorter.isConnected) return;
    setIrMonitoring(false);
    setIrStates(null);
    setHopperHasCards(null);
    setIrError(null);
    emergencyStopRequestedRef.current = false;
    setEmergencyStopDetail(null);
  }, [sorter.isConnected]);

  const setActive = (bin: number | null) => {
    activeBinRef.current = bin;
    setActiveBin(bin);
  };

  const testBin = useCallback(
    async (bin: number) => {
      if (!sorter.isReady || emergencyStopRequestedRef.current) return;
      setRouteError(null);
      setActive(bin);
      try {
        if (!(await sorter.sendNeutral())) {
          if (!emergencyStopRequestedRef.current) setRouteError(t("calibration.routing.neutralFailed"));
          return;
        }
        const reply = await sorter.sendRoute(resolveRoute(bin));
        if (emergencyStopRequestedRef.current || isEmergencyStopReply(reply)) return;
        const failure = routeFailure(reply);
        if (failure !== null) setRouteError(`${t("calibration.routing.binFailed", { bin })}${failure ? `: ${failure}` : ""}`);
      } finally {
        setActive(null);
      }
    },
    [sorter, resolveRoute, t],
  );

  const sampleRun = useCallback(async () => {
    if (!sorter.isReady || emergencyStopRequestedRef.current) return;
    setRouteError(null);
    setIsSampleRunning(true);
    try {
      if (!(await sorter.sendNeutral())) {
        if (!emergencyStopRequestedRef.current) setRouteError(t("calibration.routing.neutralFailed"));
        return;
      }
      for (let bin = 1; bin <= binCount; bin++) {
        if (emergencyStopRequestedRef.current) return;
        setActive(bin);
        const reply = await sorter.sendRoute(resolveRoute(bin));
        if (emergencyStopRequestedRef.current || isEmergencyStopReply(reply)) return;
        const failure = routeFailure(reply);
        if (failure !== null) {
          setRouteError(`${t("calibration.routing.sampleRunStopped", { bin })}${failure ? `: ${failure}` : ""}`);
          return;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, CALIBRATION_STEP_SETTLE_MS));
      }
    } finally {
      setActive(null);
      setIsSampleRunning(false);
    }
  }, [sorter, binCount, resolveRoute, t]);

  const resetToNeutral = useCallback(async () => {
    setRouteError(null);
    if (!(await sorter.sendNeutral())) setRouteError(t("calibration.routing.neutralFailed"));
  }, [sorter, t]);

  const stopFeederTest = feederTest.stop;
  const emergencyStop = useCallback(async () => {
    if (!canEmergencyStop) return;
    emergencyStopRequestedRef.current = true;
    setRouteError(null);
    setEmergencyStopDetail("stopped");
    stopFeederTest();
    if (!(await sorter.sendEmergencyStop())) setEmergencyStopDetail("unconfirmed");
  }, [canEmergencyStop, sorter, stopFeederTest]);

  const resetAfterEmergencyStop = useCallback(async () => {
    setIsResettingEmergencyStop(true);
    try {
      if (!(await sorter.sendNeutral())) {
        setEmergencyStopDetail("resetFailed");
        return;
      }
      emergencyStopRequestedRef.current = false;
      setEmergencyStopDetail(null);
    } finally {
      setIsResettingEmergencyStop(false);
    }
  }, [sorter]);

  return {
    modules,
    binCount,
    isReady: sorter.isReady,
    irStates,
    hopperHasCards,
    irMonitoring,
    activeBin,
    isSampleRunning,
    routeError,
    irError,
    canEmergencyStop,
    emergencyStopDetail,
    isResettingEmergencyStop,
    emergencyStop,
    resetAfterEmergencyStop,
    readIr,
    toggleIrMonitor: () => setIrMonitoring((value) => !value),
    testBin,
    sampleRun,
    resetToNeutral,
    feederTest,
  };
}
