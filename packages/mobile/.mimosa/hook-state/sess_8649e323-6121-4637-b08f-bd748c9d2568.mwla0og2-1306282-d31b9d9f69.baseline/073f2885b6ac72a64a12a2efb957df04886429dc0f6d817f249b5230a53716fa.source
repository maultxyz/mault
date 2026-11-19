import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  createDefaultBinRoutes,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
  type BinDirection,
  type BinHeight,
  type BinRoute,
} from "@magic-vault/shared";
import {
  binHeightsQueryOptions,
  saveBinHeight,
  saveBinRoute,
  saveDevice,
} from "@/features/calibration/api/calibration-configs";
import { binRoutesQueryOptions } from "@/features/devices/api/devices";
import { useSorter } from "@/features/sorter/api/use-sorter";
import type { LayoutDraft } from "@/lib/interfaces/calibration";

export function useLayoutDraft(): LayoutDraft {
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const device = sorter.device;
  const deviceGuid = device?.guid ?? null;
  const savedModuleCount = device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingRoutes, setPendingRoutes] = useState<Record<number, BinRoute>>({});
  const [pendingHeights, setPendingHeights] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const routesQuery = useQuery(binRoutesQueryOptions(deviceGuid));
  const heightsQuery = useQuery(binHeightsQueryOptions(deviceGuid));
  const moduleCount = pendingCount ?? savedModuleCount;
  const moduleOptions = useMemo(
    () =>
      Array.from({ length: maxModulesForLayout(device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT) }, (_, i) => i + 1),
    [device?.channelLayout],
  );

  const savedRoutes = useMemo(
    () => routesQuery.data ?? createDefaultBinRoutes(savedModuleCount),
    [routesQuery.data, savedModuleCount],
  );
  const routes = useMemo(() => savedRoutes.map((r) => pendingRoutes[r.binNumber] ?? r), [savedRoutes, pendingRoutes]);
  const heights = useMemo((): BinHeight[] => {
    const merged = new Map((heightsQuery.data ?? []).map((h) => [h.binNumber, h.height]));
    for (const [binNumber, height] of Object.entries(pendingHeights)) merged.set(Number(binNumber), height);
    return Array.from(merged, ([binNumber, height]) => ({ binNumber, height }));
  }, [heightsQuery.data, pendingHeights]);

  const isCountDirty = pendingCount != null && pendingCount !== savedModuleCount;
  const isDirty = isCountDirty || Object.keys(pendingRoutes).length > 0 || Object.keys(pendingHeights).length > 0;

  const setModuleCount = useCallback(
    (count: number) => setPendingCount(count === savedModuleCount ? null : count),
    [savedModuleCount],
  );

  const assignSlot = useCallback(
    (module: number, direction: BinDirection, binNumber: number) => {
      const displaced = routes.find((r) => r.module === module && r.direction === direction);
      const moving = routes.find((r) => r.binNumber === binNumber);
      setPendingRoutes((prev) => {
        const next = { ...prev, [binNumber]: { binNumber, module, direction } };
        if (displaced && displaced.binNumber !== binNumber && moving) {
          next[displaced.binNumber] = { binNumber: displaced.binNumber, module: moving.module, direction: moving.direction };
        }
        return next;
      });
    },
    [routes],
  );

  const setBottomModule = useCallback((binNumber: number, module: number) => {
    setPendingRoutes((prev) => ({ ...prev, [binNumber]: { binNumber, module, direction: "bottom" } }));
  }, []);

  const setHeight = useCallback((binNumber: number, height: number) => {
    setPendingHeights((prev) => ({ ...prev, [binNumber]: height }));
  }, []);

  const resetRoutes = useCallback(() => {
    setPendingRoutes(Object.fromEntries(createDefaultBinRoutes(moduleCount).map((r) => [r.binNumber, r])));
  }, [moduleCount]);

  const discard = useCallback(() => {
    setPendingCount(null);
    setPendingRoutes({});
    setPendingHeights({});
    setSaveError(false);
  }, []);

  const save = useCallback(async () => {
    if (!device || !deviceGuid) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      if (isCountDirty && pendingCount != null) {
        const saved = await saveDevice(deviceGuid, { moduleCount: pendingCount });
        sorter.updateDevice(saved);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["modules"] }),
          queryClient.invalidateQueries({ queryKey: ["bin-routes"] }),
          queryClient.invalidateQueries({ queryKey: ["bin-heights"] }),
          queryClient.invalidateQueries({ queryKey: ["bin-sets"] }),
          queryClient.invalidateQueries({ queryKey: ["devices"] }),
        ]);
        setPendingCount(null);
      }
      let latestRoutes: BinRoute[] | null = null;
      for (const route of Object.values(pendingRoutes)) latestRoutes = await saveBinRoute(deviceGuid, route);
      if (latestRoutes) queryClient.setQueryData(binRoutesQueryOptions(deviceGuid).queryKey, latestRoutes);
      setPendingRoutes({});
      let latestHeights: BinHeight[] | null = null;
      for (const [binNumber, height] of Object.entries(pendingHeights)) {
        latestHeights = await saveBinHeight(deviceGuid, Number(binNumber), height);
      }
      if (latestHeights) queryClient.setQueryData(binHeightsQueryOptions(deviceGuid).queryKey, latestHeights);
      setPendingHeights({});
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [device, deviceGuid, isCountDirty, pendingCount, pendingRoutes, pendingHeights, queryClient, sorter]);

  return {
    moduleCount,
    savedModuleCount,
    moduleOptions,
    routes,
    heights,
    isDirty,
    isReducing: isCountDirty && pendingCount != null && pendingCount < savedModuleCount,
    isSaving,
    saveError,
    setModuleCount,
    assignSlot,
    setBottomModule,
    setHeight,
    resetRoutes,
    save,
    discard,
  };
}
