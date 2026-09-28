import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { AlphabetPassDialogProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function AlphabetPassDialog({
  pendingPass,
  onClose,
}: AlphabetPassDialogProps) {
  const { t } = useTranslation("bins");
  const { isPresetMutating, setAlphabetPass } = useBinConfigs();

  const confirmPass = async () => {
    if (pendingPass === null) return;
    await setAlphabetPass(pendingPass);
    onClose();
  };

  return (
    <Dialog
      open={pendingPass !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("alphabetPanel.confirmTitle")}</DialogTitle>
          <DialogDescription>
            {t("alphabetPanel.confirmDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("alphabetPanel.cancel")}
          </Button>
          <Button
            type="button"
            disabled={isPresetMutating}
            onClick={confirmPass}
          >
            {t("alphabetPanel.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
