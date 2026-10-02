import { Switch } from "@/components/ui/switch";
import { OcrBetaDialog } from "@/features/scanner/components/ocr-beta-dialog";
import type { OcrToggleProps } from "@/lib/interfaces/settings";
import { useState } from "react";

export function OcrToggle({ checked, disabled, onCheckedChange }: OcrToggleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) =>
          next ? setDialogOpen(true) : onCheckedChange(false)
        }
      />
      <OcrBetaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={() => onCheckedChange(true)}
      />
    </>
  );
}
