import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useSerial } from "@/features/scanner/api/use-serial";
import { ESP32_FIRMWARE_URL } from "@/lib/links";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type FlashState = "idle" | "flashing" | "success" | "error";

export function Esp32FlashDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("scanner");
  const { isFlashing, flashProgress, flashLog, flashEsp32 } = useSerial();
  const [state, setState] = useState<FlashState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setState("idle");
    }
  }, [open]);

  const handleStart = async () => {
    setState("flashing");
    const result = await flashEsp32(ESP32_FIRMWARE_URL);
    if (result.success) {
      setState("success");
    } else {
      setState("error");
      setErrorMessage(result.error ?? "");
    }
  };

  const pct = flashProgress != null ? Math.round(flashProgress * 100) : 0;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isFlashing}
      title={t("serial.update.dialogTitle")}
      description={t("serial.update.dialogDescription")}
      footer={
        state === "idle" ? (
          <Button onClick={handleStart}>{t("serial.update.startButton")}</Button>
        ) : state === "flashing" ? null : (
          <Button
            variant={state === "error" ? "outline" : "default"}
            onClick={() => {
              if (state === "error") {
                setState("idle");
              } else {
                onOpenChange(false);
              }
            }}
          >
            {state === "error"
              ? t("serial.update.tryAgain")
              : t("serial.update.close")}
          </Button>
        )
      }
    >
      {state === "flashing" && (
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
          <span>{t("serial.update.success")}</span>
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
