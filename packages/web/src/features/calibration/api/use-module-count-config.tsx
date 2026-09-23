import type { Device } from "@/features/calibration/api/devices";
import { devicesQueryOptions, saveDevice } from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import type { ModuleCountConfigContextValue } from "@/lib/interfaces/calibration";
import {
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ModuleCountConfigContext =
  createContext<ModuleCountConfigContextValue | null>(null);

export function ModuleCountConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeOrg } = useOrg();
  const device = useDevice();
  const queryClient = useQueryClient();
  const devicesOpts = devicesQueryOptions(activeOrg?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [pending, setPending] = useState<number | null>(null);

  const current = device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const channelLayout = device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
  const options = useMemo(
    () =>
      Array.from({ length: maxModulesForLayout(channelLayout) }, (_, i) => i + 1),
    [channelLayout],
  );

  const displayCount = pending ?? current;
  const isDirty = pending != null && pending !== current;
  const isReducing = pending != null && pending < current;

  const stage = useCallback(
    (count: number) => setPending(count === current ? null : count),
    [current],
  );

  const discard = useCallback(() => setPending(null), []);

  const commit = useCallback(async () => {
    if (!device || pending == null) return;
    setIsSaving(true);
    try {
      const result = await saveDevice(device.guid, { moduleCount: pending });
      if (!result.success) throw new Error(result.message);
      if (result.data) {
        const saved = result.data;
        queryClient.setQueryData(
          devicesOpts.queryKey,
          (old: Device[] | undefined) =>
            old ? [saved, ...old.slice(1)] : [saved],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["bin-routes"] });
      queryClient.invalidateQueries({ queryKey: ["bin-heights"] });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      setPending(null);
    } finally {
      setIsSaving(false);
    }
  }, [device, pending, queryClient, devicesOpts.queryKey]);

  return (
    <ModuleCountConfigContext
      value={{
        current,
        displayCount,
        options,
        isDirty,
        isSaving,
        isReducing,
        stage,
        commit,
        discard,
      }}
    >
      {children}
    </ModuleCountConfigContext>
  );
}

export function useModuleCountConfig() {
  const context = useContext(ModuleCountConfigContext);
  if (!context) {
    throw new Error(
      "useModuleCountConfig must be used within a ModuleCountConfigProvider",
    );
  }
  return context;
}
