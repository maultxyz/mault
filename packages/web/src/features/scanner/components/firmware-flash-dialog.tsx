import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  FirmwareFlashState,
  FlashEsp32Result,
} from "@/lib/interfaces/scanner";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function FirmwareFlashDialog({
  open,
  onOpenChange,
  title,
  description,
  hint,
  startLabel,
  successMessage,
  successAction,
  isFlashing,
  flashProgress,
  flashLog,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  hint?: React.ReactNode;
  startLabel: string;
  successMessage: string;
  successAction?: { label: string; onClick: () => void };
  isFlashing: boolean;
  flashProgress: number | null;
  flashLog: string[];
  // Resolves null when the user backed out (e.g. dismissed the port picker).
  onStart: () => Promise<FlashEsp32Result | null>;
}) {
  const { t } = useTranslation("scanner");
  const [state, setState] = useState<FirmwareFlashState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) setState("idle");
  }, [open]);

  const describeFailure = (result: FlashEsp32Result) => {
    switch (result.reason) {
      case "wrong-chip":
        return t("serial.flash.errors.wrongChip", { chip: result.chip });
      case "no-bootloader":
        return t("serial.flash.errors.noBootloader");
      case "download-failed":
        return t("serial.flash.errors.downloadFailed");
      default:
        return result.error ?? "";
    }
  };

  const handleStart = async () => {
    const pending = onStart();
    setState("flashing");
    const result = await pending;
    if (!result) {
      setState("idle");
    } else if (result.success) {
      setState("success");
    } else {
      setState("error");
      setErrorMessage(describeFailure(result));
    }
  };

  const pct = flashProgress != null ? Math.round(flashProgress * 100) : 0;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isFlashing}
      title={title}
      description={description}
      footer={
        state === "idle" ? (
          <Button onClick={handleStart}>{startLabel}</Button>
        ) : state === "flashing" ? null : state === "error" ? (
          <Button variant="outline" onClick={() => setState("idle")}>
            {t("serial.update.tryAgain")}
          </Button>
        ) : (
          <>
            <Button
              variant={successAction ? "outline" : "default"}
              onClick={() => onOpenChange(false)}
            >
              {t("serial.update.close")}
            </Button>
            {successAction && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  successAction.onClick();
                }}
              >
                {successAction.label}
              </Button>
            )}
          </>
        )
      }
    >
      {state === "idle" && hint}

      {state === "flashing" && isFlashing && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconLoader2 className="size-3.5 shrink-0 animate-spin" />
            <span>{t("serial.update.flashing")}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {flashLog.length > 0 && (
            <ScrollArea className="h-40 rounded-md border bg-muted/30 p-2">
              <div className="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground">
                {flashLog.map((line, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- append-only log, stable order
                  <span key={i}>{line}</span>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-400">
          <IconCircleCheck className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <IconAlertTriangle className="size-4 shrink-0" />
            <span>{t("serial.update.errorTitle")}</span>
          </div>
          {errorMessage && (
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          )}
        </div>
      )}
    </DynamicDialog>
  );
}
