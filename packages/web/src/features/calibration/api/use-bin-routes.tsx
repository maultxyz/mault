import {
  binRoutesQueryOptions,
  saveBinRoute,
} from "@/features/calibration/api/bin-routes";
import { useDevice } from "@/features/calibration/api/use-device";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import type { BinRoutesContextValue } from "@/lib/interfaces/calibration";
import { createDefaultBinRoutes, type BinRoute } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const BinRoutesContext = createContext<BinRoutesContextValue | null>(null);

export function BinRoutesProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const device = useDevice();
  const moduleCount = useModuleCount();
  const [isSaving, setIsSaving] = useState(false);
  const [pending, setPending] = useState<Record<number, BinRoute>>({});

  const queryOpts = binRoutesQueryOptions(device?.guid);
  const { data: savedRoutes = createDefaultBinRoutes(moduleCount) } =
    useQuery(queryOpts);

  const routes = useMemo(
    () => savedRoutes.map((r) => pending[r.binNumber] ?? r),
    [savedRoutes, pending],
  );

  const isDirty = Object.keys(pending).length > 0;

  const save = useCallback((route: BinRoute) => {
    setPending((prev) => ({ ...prev, [route.binNumber]: route }));
  }, []);

  const swap = useCallback((route: BinRoute, displaced: BinRoute) => {
    setPending((prev) => ({
      ...prev,
      [route.binNumber]: route,
      [displaced.binNumber]: displaced,
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = createDefaultBinRoutes(moduleCount);
    setPending(Object.fromEntries(defaults.map((r) => [r.binNumber, r])));
  }, [moduleCount]);

  const discard = useCallback(() => setPending({}), []);

  const commit = useCallback(async () => {
    if (!device) return;
    setIsSaving(true);
    try {
      let result;
      for (const route of Object.values(pending)) {
        result = await saveBinRoute(device.guid, route);
        if (!result.success) throw new Error(result.message);
      }
      if (result?.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
      }
      setPending({});
    } finally {
      setIsSaving(false);
    }
  }, [device, pending, queryClient, queryOpts.queryKey]);

  return (
    <BinRoutesContext
      value={{
        routes,
        isDirty,
        isSaving,
        save,
        swap,
        resetToDefaults,
        commit,
        discard,
      }}
    >
      {children}
    </BinRoutesContext>
  );
}

export function useBinRoutes() {
  const context = useContext(BinRoutesContext);
  if (!context) {
    throw new Error("useBinRoutes must be used within a BinRoutesProvider");
  }
  return context;
}
