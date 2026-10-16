import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { saveDevice } from "@/features/calibration/api/calibration-configs";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { DEVICE_TOGGLE_KEYS } from "@/lib/constants/calibration";
import type { DeviceToggleKey, DeviceToggles, DeviceTogglesDraft } from "@/lib/interfaces/calibration";

export function useDeviceTogglesDraft(): DeviceTogglesDraft {
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const device = sorter.device;
  const [pending, setPending] = useState<Partial<DeviceToggles>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saved = useMemo<DeviceToggles>(
    () => ({
      autoConnect: device?.autoConnect ?? false,
      testOnConnect: device?.testOnConnect ?? true,
      pipelinedFeed: device?.pipelinedFeed ?? false,
    }),
    [device?.autoConnect, device?.testOnConnect, device?.pipelinedFeed],
  );
  const changed = DEVICE_TOGGLE_KEYS.filter((key) => key in pending && pending[key] !== saved[key]);

  const set = useCallback((key: DeviceToggleKey, value: boolean) => {
    setPending((prev) => ({ ...prev, [key]: value }));
  }, []);
  const discard = useCallback(() => {
    setPending({});
    setSaveError(false);
  }, []);
  const save = useCallback(async () => {
    if (!device || changed.length === 0) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      const next = await saveDevice(device.guid, Object.fromEntries(changed.map((key) => [key, pending[key]])));
      sorter.updateDevice(next);
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      setPending({});
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [device, changed, pending, sorter, queryClient]);

  return { values: { ...saved, ...pending }, isDirty: changed.length > 0, isSaving, saveError, set, save, discard };
}
