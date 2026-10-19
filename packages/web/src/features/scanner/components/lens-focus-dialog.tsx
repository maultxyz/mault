import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { PI_CAMERA_BASE } from "@/features/scanner/lib/pi-camera";
import type { LensFocusDialogProps } from "@/lib/interfaces/scanner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function LensFocusDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: LensFocusDialogProps) {
  const { t } = useTranslation("scanner");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  return (
    <DynamicDialog
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        if (controlledOpen === undefined) setUncontrolledOpen(next);
        onOpenChange?.(next);
      }}
      title={t("lensFocus.title")}
      description={t("lensFocus.description")}
      className="sm:max-w-fit"
    >
      {open && (
        <div className="relative mx-auto h-[min(78vh,52rem)] aspect-[2.5/3.5] overflow-hidden rounded-lg bg-black [container-type:size]">
          <img
            src={`${PI_CAMERA_BASE}/stream`}
            alt={t("lensFocus.previewAlt")}
            className="absolute top-1/2 left-1/2 h-[100cqw] w-[100cqh] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-fill"
          />
        </div>
      )}
    </DynamicDialog>
  );
}
