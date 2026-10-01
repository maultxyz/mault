import {
  devicesQueryOptions,
  saveDevice,
  type Device,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { DEVICE_TOGGLE_KEYS } from "@/lib/constants/calibration";
import type {
  DeviceToggleKey,
  DeviceToggles,
  DeviceTogglesDraft,
} from "@/lib/interfaces/calibration";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

export function useDeviceTogglesDraft(): DeviceTogglesDraft {
  const { activeOrg } = useOrg();
  const device = useDevice();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Partial<DeviceToggles>>({});
  const [isSaving, setIsSaving] = useState(false);

  const saved = useMemo<DeviceToggles>(
    () => ({
      autoConnect: device?.autoConnect ?? false,
      testOnConnect: device?.testOnConnect ?? true,
      pipelinedFeed: device?.pipelinedFeed ?? false,
    }),
    [device?.autoConnect, device?.testOnConnect, device?.pipelinedFeed],
  );

  const changed = useMemo(
    () =>
      DEVICE_TOGGLE_KEYS.filter(
        (key) => key in pending && pending[key] !== saved[key],
      ),
    [pending, saved],
  );

  const set = useCallback((key: DeviceToggleKey, value: boolean) => {
    setPending((prev) => ({ ...prev, [key]: value }));
  }, []);

  const discard = useCallback(() => setPending({}), []);

  const commit = useCallback(async () => {
    if (!device?.guid || changed.length === 0) return;
    setIsSaving(true);
    try {
      const patch = Object.fromEntries(
        changed.map((key) => [key, pending[key]]),
      );
      const result = await saveDevice(device.guid, patch);
      if (!result.success) throw new Error(result.message);
      if (result.data) {
        const savedDevice = result.data;
        queryClient.setQueryData(
          devicesQueryOptions(activeOrg?.id).queryKey,
          (old: Device[] | undefined) =>
            old?.map((d) => (d.guid === savedDevice.guid ? savedDevice : d)),
        );
      }
      setPending({});
    } finally {
      setIsSaving(false);
    }
  }, [device?.guid, changed, pending, queryClient, activeOrg?.id]);

  return {
    values: { ...saved, ...pending },
    isLoaded: !!device?.guid,
    isDirty: changed.length > 0,
    isSaving,
    set,
    commit,
    discard,
  };
}
