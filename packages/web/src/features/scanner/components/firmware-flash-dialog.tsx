import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirmwareOptions } from "@/features/scanner/api/use-firmware-options";
import { useStickToBottom } from "@/hooks/use-stick-to-bottom";
import { BUNDLED_FIRMWARE_OPTION_KEY } from "@/lib/constants/firmware";
import type {
  FirmwareFlashState,
  FirmwareOption,
  FlashEsp32Result,
} from "@/lib/interfaces/scanner";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { useEffect, useId, useState } from "react";
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
  onStart: (firmwareUrl: string) => Promise<FlashEsp32Result | null>;
}) {
  const { t } = useTranslation("scanner");
  const versionSelectId = useId();
  const [state, setState] = useState<FirmwareFlashState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const flashLogRef = useStickToBottom(flashLog);
  const firmwareOptions = useFirmwareOptions(open);
  const [selectedOptionKey, setSelectedOptionKey] = useState(
    BUNDLED_FIRMWARE_OPTION_KEY,
  );
  const selectedOption =
    firmwareOptions.find((option) => option.key === selectedOptionKey) ??
    firmwareOptions[0];

  useEffect(() => {
    if (open) return;
    setState("idle");
    setSelectedOptionKey(BUNDLED_FIRMWARE_OPTION_KEY);
  }, [open]);

  const optionLabel = (option: FirmwareOption) =>
    !option.isBundled
      ? t("serial.flash.version.option", { version: option.version })
      : option.version
        ? t("serial.flash.version.recommended", { version: option.version })
        : t("serial.flash.version.recommendedUnknownVersion");

  const describeFailure = (result: FlashEsp32Result) => {
    switch (result.reason) {
      case "wrong-chip":
        return t("serial.flash.errors.wrongChip", { chip: result.chip });
      case "no-bootloader":
        return t("serial.flash.errors.noBootloader");
      case "port-unavailable":
        return t("serial.flash.errors.portUnavailable");
      case "download-failed":
        return t("serial.flash.errors.downloadFailed");
      case "invalid-image":
        return t("serial.flash.errors.invalidImage");
      case "verify-failed":
        return t("serial.flash.errors.verifyFailed");
      default:
        return result.error ?? "";
    }
  };

  const handleStart = async () => {
    const pending = onStart(selectedOption.firmwareUrl);
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
      {state === "idle" && (
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor={versionSelectId}>
              {t("serial.flash.version.label")}
            </FieldLabel>
            <Select
              value={selectedOption.key}
              onValueChange={(optionKey) => {
                if (optionKey) setSelectedOptionKey(optionKey);
              }}
            >
              <SelectTrigger id={versionSelectId} className="w-full">
                <SelectValue>{optionLabel(selectedOption)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {firmwareOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {optionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!selectedOption.isBundled && (
            <Callout variant="warning">
              {t("serial.flash.version.otherVersionWarning")}
            </Callout>
          )}
          {hint}
        </div>
      )}

      {state === "flashing" && isFlashing && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground/70">
            <IconLoader2 className="size-3.5 shrink-0 animate-spin" />
            <span>{t("serial.update.flashing")}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("serial.update.flashing")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1.5 overflow-hidden rounded-full bg-secondary/50"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {flashLog.length > 0 && (
            <ScrollArea
              viewportRef={flashLogRef}
              className="h-40 rounded-lg border bg-muted/30 p-2"
            >
              <div className="flex flex-col gap-0.5 font-mono text-xs text-foreground/70">
                {flashLog.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {state === "success" && (
        <div
          role="status"
          className="flex items-center gap-2 text-sm text-success-foreground"
        >
          <IconCircleCheck className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {state === "error" && (
        <div role="alert" className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <IconAlertTriangle className="size-4 shrink-0" />
            <span>{t("serial.update.errorTitle")}</span>
          </div>
          {errorMessage && (
            <p className="text-xs text-foreground/70">{errorMessage}</p>
          )}
        </div>
      )}
    </DynamicDialog>
  );
}
