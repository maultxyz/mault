import {
  deleteDevice,
  devicesQueryOptions,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Device } from "@/lib/interfaces/calibration";

export function useDeleteDevice() {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();

  return useMutation({
    mutationFn: async (device: Device) => {
      const result = await deleteDevice(device.guid);
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: (_data, device) => {
      toast.success(t("stations.overview.deleted", { name: device.name }));
      void queryClient.invalidateQueries({
        queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
      });
    },
    onError: (err, device) => {
      toast.error(t("stations.overview.deleteFailed", { name: device.name }), {
        description: err.message,
      });
    },
  });
}

export function useDeleteDevices() {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();

  return useMutation({
    mutationFn: async (devices: Device[]) => {
      const results = await Promise.allSettled(
        devices.map(async (device) => {
          const result = await deleteDevice(device.guid);
          if (!result.success) throw new Error(result.message);
        }),
      );
      return results.filter((r) => r.status === "rejected").length;
    },
    onSuccess: (failed, devices) => {
      const deleted = devices.length - failed;
      if (deleted > 0) {
        toast.success(t("stations.overview.bulkDeleted", { count: deleted }));
      }
      if (failed > 0) {
        toast.error(t("stations.overview.bulkDeleteFailed", { count: failed }));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
      });
    },
  });
}
