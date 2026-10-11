import { Button } from "@/components/ui/button";
import { ALERT_BANNER_ACTION_CLASS } from "@/lib/constants/colors";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  devicesQueryOptions,
  saveDevice,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Device } from "@/lib/interfaces/calibration";

export function ChannelLayoutUpgradeButton() {
  const { t } = useTranslation("calibration");
  const device = useDevice();
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (guid: string) =>
      saveDevice(guid, { channelLayout: "standard" }),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(t("channelLayoutUpgrade.failed"));
        return;
      }
      const saved = result.data;
      queryClient.setQueryData(
        devicesQueryOptions(activeOrg?.id).queryKey,
        (old: Device[] | undefined) =>
          old?.map((d) => (d.guid === saved.guid ? saved : d)),
      );
      setOpen(false);
      toast.success(t("channelLayoutUpgrade.done"));
    },
    onError: () => toast.error(t("channelLayoutUpgrade.failed")),
  });

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
        className={ALERT_BANNER_ACTION_CLASS}
      >
        {t("channelLayoutUpgrade.bannerAction")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("channelLayoutUpgrade.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("channelLayoutUpgrade.confirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("channelLayoutUpgrade.cancel")}
            </DialogClose>
            <Button
              disabled={!device || mutation.isPending}
              onClick={() => device && mutation.mutate(device.guid)}
            >
              {t("channelLayoutUpgrade.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
