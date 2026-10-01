import {
  devicesQueryOptions,
  saveDevice,
  type Device,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import type { DeviceSettingsChange } from "@/lib/interfaces/calibration";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSaveDeviceSettings(errorMessage: string) {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const devicesKey = devicesQueryOptions(activeOrg?.id).queryKey;

  return useMutation({
    mutationFn: ({ guid, patch }: DeviceSettingsChange) =>
      saveDevice(guid, patch),
    onMutate: async ({ guid, patch }) => {
      await queryClient.cancelQueries({ queryKey: devicesKey });
      const previous = queryClient.getQueryData<Device[]>(devicesKey);
      queryClient.setQueryData(devicesKey, (old: Device[] | undefined) =>
        old?.map((d) =>
          d.guid === guid ? { ...d, ...(patch as Partial<Device>) } : d,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(devicesKey, ctx.previous);
      toast.error(errorMessage);
    },
    onSuccess: (result, _vars, ctx) => {
      if (result.success && result.data) {
        const saved = result.data;
        queryClient.setQueryData(devicesKey, (old: Device[] | undefined) =>
          old?.map((d) => (d.guid === saved.guid ? saved : d)),
        );
        return;
      }
      if (ctx?.previous) queryClient.setQueryData(devicesKey, ctx.previous);
      toast.error(errorMessage);
    },
  });
}
