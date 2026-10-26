import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { MOBILE_SAVE_BAR_CLASS } from "@/lib/constants/nav";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { SaveBarProps } from "@/lib/interfaces/save-bar";

export function SaveBar({
  show,
  formId,
  onSave,
  isSaving = false,
  onDiscard,
  className,
  saveButtonDataTour,
}: SaveBarProps) {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const piHost = usePiHost();
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  useHotkeys({
    save:
      show && !isSaving
        ? () => saveButtonRef.current?.click()
        : undefined,
  });

  if (!show) return null;

  return createPortal(
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 z-50 mx-auto flex w-fit items-center gap-3 rounded-lg border bg-popover px-1 pl-2 py-1 text-xs shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-150 motion-reduce:animate-none",
        isMobile && piHost ? MOBILE_SAVE_BAR_CLASS : "bottom-8",
        className,
      )}
    >
      <span className="text-foreground/70">
        {t("unsavedChanges.message")}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onDiscard}
          disabled={isSaving}
        >
          {t("unsavedChanges.discard")}
        </Button>
        <Button
          ref={saveButtonRef}
          type={formId ? "submit" : "button"}
          form={formId}
          onClick={formId ? undefined : onSave}
          disabled={isSaving}
          data-tour={saveButtonDataTour}
        >
          {isSaving && <IconLoader2 className="size-3.5 animate-spin" />}
          {isSaving ? t("unsavedChanges.saving") : t("unsavedChanges.save")}
          {!isSaving && <HotkeyHint id="save" className="max-md:hidden" />}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
