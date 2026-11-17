import { binRoutesQueryOptions } from "@/features/calibration/api/bin-routes";
import { useDevice } from "@/features/calibration/api/use-device";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { buildBinLevelLayout } from "@/lib/bin-machine-layout";
import type { BinLevelLayout } from "@/lib/interfaces/scanner";
import { createDefaultBinRoutes } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useBinMachineLayout(binNumbers: number[]): BinLevelLayout {
  const device = useDevice();
  const moduleCount = useModuleCount();
  const { data: savedRoutes } = useQuery(binRoutesQueryOptions(device?.guid));
  return useMemo(
    () =>
      buildBinLevelLayout(
        savedRoutes ?? createDefaultBinRoutes(moduleCount),
        binNumbers,
      ),
    [savedRoutes, moduleCount, binNumbers],
  );
}
