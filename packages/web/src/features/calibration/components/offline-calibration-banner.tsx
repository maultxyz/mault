import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OfflineCalibrationBannerProps } from "@/lib/interfaces/calibration";
import { IconAlertTriangle, IconPlugConnectedX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function OfflineCalibrationBanner({
  isOffline,
  onStart,
  onStop,
}: OfflineCalibrationBannerProps) {
  const { t } = useTranslation("calibration");
  const [warningOpen, setWarningOpen] = useState(false);

  return (
    <>
      {isOffline ? (
        <Callout
          variant="warning"
          icon={IconAlertTriangle}
          title={t("offlineCalibration.activeTitle")}
          action={
            <Button variant="outline" size="sm" onClick={onStop}>
              {t("offlineCalibration.stop")}
            </Button>
          }
        >
          {t("offlineCalibration.activeBody")}
        </Callout>
      ) : (
        <Callout
          variant="neutral"
          icon={IconPlugConnectedX}
          title={t("offlineCalibration.notConnectedTitle")}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWarningOpen(true)}
            >
              {t("offlineCalibration.start")}
            </Button>
          }
        >
          {t("offlineCalibration.notConnectedBody")}
        </Callout>
      )}

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("offlineCalibration.warningTitle")}</DialogTitle>
            <DialogDescription>
              {t("offlineCalibration.warningDescription")}
            </DialogDescription>
          </DialogHeader>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            <li>{t("offlineCalibration.warningNoPreview")}</li>
            <li>{t("offlineCalibration.warningDamage")}</li>
            <li>{t("offlineCalibration.warningSync")}</li>
          </ul>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("offlineCalibration.cancel")}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                onStart();
                setWarningOpen(false);
              }}
            >
              {t("offlineCalibration.accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
