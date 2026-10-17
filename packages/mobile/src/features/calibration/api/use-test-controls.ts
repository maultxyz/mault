import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { computeBinCount, createDefaultBinRoutes, DEFAULT_MODULE_COUNT, type BinRoute } from "@magic-vault/shared";
import { binRoutesQueryOptions } from "@/features/devices/api/devices";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { CALIBRATION_STEP_SETTLE_MS, IR_MONITOR_INTERVAL_MS, IR_READ_TIMEOUT_MS } from "@/lib/constants/calibration";
import type { IrReading, TestControls } from "@/lib/interfaces/calibration";
import type { SorterMessage } from "@/lib/interfaces/sorter";

function routeFailure(response: unknown): string | null {
  if (!response) return "";
  if (typeof response === "object" && response !== null && "error" in response) {
    return String((response as SorterMessage).error);
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
  const [irStates, setIrStates] = useState<boolean[] | null>(null);
  const [hopperHasCards, setHopperHasCards] = useState<boolean | null>(null);
  const [irMonitoring, setIrMonitoring] = useState(false);
  const [activeBin, setActiveBin] = useState<number | null>(null);
  const [isSampleRunning, setIsSampleRunning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const irBusyRef = useRef(false);
  const activeBinRef = useRef<number | null>(null);

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
      if (!line) return;
      const parsed = JSON.parse(line) as IrReading;
      if (Array.isArray(parsed.ir)) setIrStates(parsed.ir as boolean[]);
      if (typeof parsed.hopper === "boolean") setHopperHasCards(parsed.hopper);
    } catch {
      return;
    } finally {
      irBusyRef.current = false;
    }
  }, [sorter]);

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
  }, [sorter.isConnected]);

  const setActive = (bin: number | null) => {
    activeBinRef.current = bin;
    setActiveBin(bin);
  };

  const testBin = useCallback(
    async (bin: number) => {
      if (!sorter.isReady) return;
      setRouteError(null);
      setActive(bin);
      try {
        if (!(await sorter.sendNeutral())) return;
        const failure = routeFailure(await sorter.sendRoute(resolveRoute(bin)));
        if (failure !== null) setRouteError(`${t("calibration.routing.binFailed", { bin })}${failure ? `: ${failure}` : ""}`);
      } finally {
        setActive(null);
      }
    },
    [sorter, resolveRoute, t],
  );

  const sampleRun = useCallback(async () => {
    if (!sorter.isReady) return;
    setRouteError(null);
    setIsSampleRunning(true);
    try {
      if (!(await sorter.sendNeutral())) return;
      for (let bin = 1; bin <= binCount; bin++) {
        setActive(bin);
        const failure = routeFailure(await sorter.sendRoute(resolveRoute(bin)));
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
    await sorter.sendNeutral();
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
    readIr,
    toggleIrMonitor: () => setIrMonitoring((value) => !value),
    testBin,
    sampleRun,
    resetToNeutral,
  };
}
