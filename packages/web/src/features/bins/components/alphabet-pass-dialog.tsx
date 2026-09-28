import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAlphabetPass } from "@/features/bins/api/use-alphabet-pass";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { AlphabetPassDialogProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function AlphabetPassDialog({
  pending,
  onClose,
}: AlphabetPassDialogProps) {
  const { t } = useTranslation("bins");
  const { isPresetMutating, setAlphabetPass } = useBinConfigs();
  const { prefix } = useAlphabetPass();
  const startsPile =
    pending !== null && pending.prefix !== "" && pending.prefix !== prefix;

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
            {startsPile
              ? t("alphabetPanel.confirmPileTitle", { prefix: pending.prefix })
              : t("alphabetPanel.confirmTitle")}
          </DialogTitle>
          <DialogDescription>
            {startsPile
              ? t("alphabetPanel.confirmPileDescription", {
                  prefix: pending.prefix,
                })
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
