import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FLATBED_STEP_LABELS_WITHOUT_SORTER,
  FLATBED_STEP_LABELS_WITH_SORTER,
} from "@/lib/constants/scanner";
import type {
  FlatbedScanControlsProps,
  FlatbedScanStep,
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

function activeStepIndex(step: FlatbedScanStep, hasSorter: boolean): number {
  if (step === "place-card" || step === "scanning") return 0;
  if (step === "move-card" || step === "missed-card") return 1;
  return hasSorter ? 2 : 1;
}

export function FlatbedScanControls({
  flow,
  orientation,
}: FlatbedScanControlsProps) {
  const { t } = useTranslation("scanner");
  const stepLabels = flow.hasSorter
    ? FLATBED_STEP_LABELS_WITH_SORTER
    : FLATBED_STEP_LABELS_WITHOUT_SORTER;
  const currentStepIndex = activeStepIndex(flow.step, flow.hasSorter);
  const isWaitingForCard =
    flow.step === "move-card" || flow.step === "missed-card";
  const isBusy = flow.step === "scanning" || flow.step === "identifying";
  const isVertical = orientation === "vertical";

  const instruction =
    flow.step === "move-card"
      ? t("flatbed.instruction.moveCard", { seconds: flow.secondsLeft ?? 0 })
      : flow.step === "done" && !flow.hasSorter
        ? t("flatbed.instruction.doneWithoutSorter")
        : t(`flatbed.instruction.${flow.step}`);

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex gap-1.5 text-xs" aria-label={t("flatbed.stepsLabel")}>
        {stepLabels.map((labelKey, index) => (
          <li
            key={labelKey}
            aria-current={index === currentStepIndex ? "step" : undefined}
            className={cn(
              "flex-1 truncate rounded-sm px-1.5 py-0.5 text-center",
              index === currentStepIndex
                ? "bg-primary text-primary-foreground"
                : index < currentStepIndex
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted text-foreground/70",
            )}
          >
            {t(labelKey)}
          </li>
        ))}
      </ol>
      <p
        className={cn(
          "text-xs",
          flow.step === "missed-card" ? "text-warning" : "text-foreground/70",
        )}
        aria-live="polite"
      >
        {instruction}
      </p>
      <div className={cn("flex gap-1.5", isVertical ? "flex-col" : "flex-row")}>
        {flow.step === "missed-card" ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className={cn(!isVertical && "flex-1")}
                  onClick={flow.continueAfterMissedCard}
                >
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
                  className={cn(!isVertical && "flex-1")}
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
        )}
        {isWaitingForCard && (
          <>
            <Button variant="outline" onClick={flow.rescan}>
              <IconRefresh />
              {t("flatbed.rescan")}
            </Button>
            <Button variant="ghost" onClick={flow.cancelWait}>
              <IconX />
              {t("flatbed.cancel")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
