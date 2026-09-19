import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { IconAdjustments, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface StaleDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunTest: () => void;
  onCalibrateFirst: () => void;
}

export function StaleDeviceDialog({
  open,
  onOpenChange,
  onRunTest,
  onCalibrateFirst,
}: StaleDeviceDialogProps) {
  const { t } = useTranslation("scanner");

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("staleDeviceDialog.title")}
      description={t("staleDeviceDialog.description")}
      footerClassName="flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button variant="outline" onClick={onRunTest}>
            <IconPlayerPlay />
            {t("staleDeviceDialog.runTest")}
          </Button>
          <Button onClick={onCalibrateFirst}>
            <IconAdjustments />
            {t("staleDeviceDialog.calibrateFirst")}
          </Button>
        </>
      }
    />
  );
}
