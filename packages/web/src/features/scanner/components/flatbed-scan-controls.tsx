import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  FlatbedScanButtonProps,
  FlatbedScanControlsProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconLoader2,
  IconPlayerPlay,
  IconRefresh,
  IconScan,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function FlatbedScanControls({
  flow,
  orientation,
}: FlatbedScanControlsProps) {
  const { t } = useTranslation("scanner");
  const isWaitingForCard =
    flow.step === "move-card" || flow.step === "missed-card";
  if (!isWaitingForCard) return null;

  return (
    <div
      className={cn(
        "flex gap-1.5",
        orientation === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      <Button variant="outline" onClick={flow.rescan}>
        <IconRefresh />
        {t("flatbed.rescan")}
      </Button>
      <Button variant="ghost" onClick={flow.cancelWait}>
        <IconX />
        {t("flatbed.cancel")}
      </Button>
    </div>
  );
}

export function FlatbedScanButton({ flow, className }: FlatbedScanButtonProps) {
  const { t } = useTranslation("scanner");
  const isWaitingForCard =
    flow.step === "move-card" || flow.step === "missed-card";
  const isBusy = flow.step === "scanning" || flow.step === "identifying";

  return flow.step === "missed-card" ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button className={className} onClick={flow.continueAfterMissedCard}>
            <IconPlayerPlay />
            {t("flatbed.continue")}
          </Button>
        }
      />
      <TooltipContent>
        {t("flatbed.continueTooltip")}
        <HotkeyHint id="scanFlatbedCard" />
      </TooltipContent>
    </Tooltip>
  ) : (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={className}
            disabled={isBusy || isWaitingForCard}
            onClick={flow.scanCard}
          >
            {isBusy ? <IconLoader2 className="animate-spin" /> : <IconScan />}
            {flow.step === "scanning"
              ? t("flatbed.scanning")
              : flow.step === "identifying"
                ? t("flatbed.identifying")
                : t("flatbed.scanCard")}
          </Button>
        }
      />
      <TooltipContent>
        {t("flatbed.scanCardTooltip")}
        <HotkeyHint id="scanFlatbedCard" />
      </TooltipContent>
    </Tooltip>
  );
}
