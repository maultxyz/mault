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
import type { OfflineCalibrationWarningDialogProps } from "@/lib/interfaces/calibration";
import { useTranslation } from "react-i18next";

export function OfflineCalibrationWarningDialog({
  open,
  onOpenChange,
  onAccept,
}: OfflineCalibrationWarningDialogProps) {
  const { t } = useTranslation("calibration");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onAccept();
              onOpenChange(false);
            }}
          >
            {t("offlineCalibration.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
