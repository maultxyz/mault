import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { OfflineCalibrationWarningDialog } from "@/features/calibration/components/offline-calibration-warning-dialog";
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

      <OfflineCalibrationWarningDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
        onAccept={onStart}
      />
    </>
  );
}
