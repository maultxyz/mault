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
import { useTranslation } from "react-i18next";

interface OcrBetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OcrBetaDialog({
  open,
  onOpenChange,
  onConfirm,
}: OcrBetaDialogProps) {
  const { t } = useTranslation("scanner");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ocrBetaDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("ocrBetaDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("ocrBetaDialog.cancel")}
          </DialogClose>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t("ocrBetaDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
