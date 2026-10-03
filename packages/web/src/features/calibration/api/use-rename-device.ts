import {
  devicesQueryOptions,
  saveDevice,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useRenameDevice() {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();

  return useMutation({
    mutationFn: async ({ guid, name }: { guid: string; name: string }) => {
      const result = await saveDevice(guid, { name });
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: devicesQueryOptions(activeOrg?.id).queryKey,
      });
    },
    onError: (err) => {
      toast.error(t("stations.overview.renameFailed"), {
        description: err.message,
      });
    },
  });
}
