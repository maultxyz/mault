import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type SaveBarProps = {
  show: boolean;
  isSaving?: boolean;
  saveDisabled?: boolean;
  onDiscard: () => void;
  className?: string;
  saveButtonDataTour?: string;
} & (
  | {
      formId: string;
      onSave?: never;
    }
  | {
      formId?: never;
      onSave: () => void;
    }
);

export function SaveBar({
  show,
  formId,
  onSave,
  isSaving = false,
  saveDisabled = false,
  onDiscard,
  className,
  saveButtonDataTour,
}: SaveBarProps) {
  const { t } = useTranslation("common");

  if (!show) return null;

  return createPortal(
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 bottom-8 z-50 mx-auto flex w-fit items-center gap-3 rounded-md border bg-popover px-1 pl-2 py-1 text-xs shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-150",
        className,
      )}
    >
      <span className="text-muted-foreground">
        {t("unsavedChanges.message")}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={isSaving}
        >
          {t("unsavedChanges.discard")}
        </Button>
        <Button
          type={formId ? "submit" : "button"}
          form={formId}
          onClick={formId ? undefined : onSave}
          size="sm"
          disabled={isSaving || saveDisabled}
          data-tour={saveButtonDataTour}
        >
          {isSaving && <IconLoader2 className="size-3.5 animate-spin" />}
          {isSaving ? t("unsavedChanges.saving") : t("unsavedChanges.save")}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
