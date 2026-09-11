import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BinConfig } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface BinLimitDialogProps {
  bin: BinConfig | null;
  onContinue: () => Promise<void>;
}

export function BinLimitDialog({ bin, onContinue }: BinLimitDialogProps) {
  const { t } = useTranslation("scanner");
  const [isContinuing, setIsContinuing] = useState(false);

  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      await onContinue();
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <Dialog open={!!bin} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {t("binLimitDialog.title", { number: bin?.binNumber })}
          </DialogTitle>
          <DialogDescription>
            {t("binLimitDialog.description", {
              number: bin?.binNumber,
              limit: bin?.cardLimit,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleContinue} disabled={isContinuing}>
            {isContinuing && <IconLoader2 className="size-4 animate-spin" />}
            {t("binLimitDialog.continueButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
