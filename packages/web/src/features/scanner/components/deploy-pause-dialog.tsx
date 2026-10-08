import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import type { DeployPauseDialogProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

export function DeployPauseDialog({
  open,
  pausedCount,
  onResume,
  onClose,
}: DeployPauseDialogProps) {
  const { t } = useTranslation("scanner");

  return (
    <DynamicDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("deployPause.title")}
      description={t("deployPause.description", { count: pausedCount })}
      className="sm:max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("deployPause.stayPaused")}
          </Button>
          <Button onClick={onResume}>
            {t("deployPause.resume", { count: pausedCount })}
          </Button>
        </>
      }
    />
  );
}
