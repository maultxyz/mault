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
import { getAlphabetStepPile } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function AlphabetPassDialog({
  pending,
  onClose,
}: AlphabetPassDialogProps) {
  const { t } = useTranslation("bins");
  const { configs, isPresetMutating, setAlphabetPass } = useBinConfigs();
  const pile = pending === null ? null : getAlphabetStepPile(configs, pending);

  const confirmPass = async () => {
    if (pending === null) return;
    await setAlphabetPass(pending);
    onClose();
  };

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {pile
              ? t("alphabetPanel.confirmPileTitle", { pile })
              : t("alphabetPanel.confirmTitle")}
          </DialogTitle>
          <DialogDescription>
            {pile
              ? t("alphabetPanel.confirmPileDescription", { pile })
              : t("alphabetPanel.confirmDescription")}
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
