import {
  deleteDevice,
  devicesQueryOptions,
  type Device,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

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
