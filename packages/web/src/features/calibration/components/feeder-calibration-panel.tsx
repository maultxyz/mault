import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FeederCalibration } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

interface FeederCalibrationPanelProps {
  speedValue: number;
  durationValue: number;
  pulseDurationValue: number;
  pauseDurationValue: number;
  settleDurationValue: number;
  calibration: FeederCalibration | undefined;
  isLoading: boolean;
  isConnected: boolean;
  onSpeedChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onPulseDurationChange: (value: number) => void;
  onPauseDurationChange: (value: number) => void;
  onSettleDurationChange: (value: number) => void;
  onSetSpeed: () => void;
  onSetDuration: () => void;
  onSetPulseDuration: () => void;
  onSetContinuous: () => void;
  onSetPauseDuration: () => void;
  onSetSettleDuration: () => void;
}

export function FeederCalibrationPanel({
  speedValue,
  durationValue,
  pulseDurationValue,
  pauseDurationValue,
  settleDurationValue,
  calibration,
  isLoading,
  isConnected,
  onSpeedChange,
  onDurationChange,
  onPulseDurationChange,
  onPauseDurationChange,
  onSettleDurationChange,
  onSetSpeed,
  onSetDuration,
  onSetPulseDuration,
  onSetContinuous,
  onSetPauseDuration,
  onSetSettleDuration,
}: FeederCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      <div className="rounded-lg border bg-sidebar p-2 flex flex-col gap-5">
        <h2 className="text-sm font-semibold font-heading">
          {t("feederCalibrationPanel.heading")}
        </h2>
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <p className="text-xs text-muted-foreground w-fit">
                  {t("feederCalibrationPanel.speedLabel")}
                </p>
              }
            />
            <TooltipContent>
              {t("feederCalibrationPanel.speedTooltip")}
            </TooltipContent>
          </Tooltip>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected || speedValue <= 120}
              onClick={() => onSpeedChange(Math.max(120, speedValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || speedValue <= 120}
              onClick={() => onSpeedChange(speedValue - 1)}
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-between px-2 items-center">
              <p className="text-xs text-muted-foreground">120</p>
              <p className="font-bold text-sm">{speedValue}</p>
              <p className="text-xs text-muted-foreground">490</p>
            </div>
            <Button
              variant="outline"
              disabled={!isConnected || speedValue >= 490}
              onClick={() => onSpeedChange(speedValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || speedValue >= 490}
              onClick={() => onSpeedChange(Math.min(490, speedValue + 10))}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetSpeed}
              className="flex-1"
            >
              {t("feederCalibrationPanel.setSpeed")}
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.speed}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {t("feederCalibrationPanel.timeoutLabel")}
          </p>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected || durationValue <= 10}
              onClick={() =>
                onDurationChange(Math.max(10, durationValue - 100))
              }
              className="px-2 text-xs"
            >
              -100
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || durationValue <= 10}
              onClick={() => onDurationChange(Math.max(10, durationValue - 10))}
              className="px-2 text-xs"
            >
              -10
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">
                {t("feederCalibrationPanel.msValue", { value: durationValue })}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onDurationChange(durationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onDurationChange(durationValue + 100)}
              className="px-2 text-xs"
            >
              +100
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetDuration}
              className="flex-1"
            >
              {t("feederCalibrationPanel.setTimeout")}
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {t("feederCalibrationPanel.msValue", {
                value: calibration.duration,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("feederCalibrationPanel.pulseDurationLabel")}
            </p>
            {pulseDurationValue <= 0 && (
              <p className="text-xs text-muted-foreground italic">
                {t("feederCalibrationPanel.continuous")}
              </p>
            )}
          </div>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected || pulseDurationValue <= 0}
              onClick={() =>
                onPulseDurationChange(Math.max(0, pulseDurationValue - 10))
              }
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || pulseDurationValue <= 0}
              onClick={() =>
                onPulseDurationChange(Math.max(0, pulseDurationValue - 1))
              }
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">
                {pulseDurationValue <= 0
                  ? t("feederCalibrationPanel.continuous")
                  : t("feederCalibrationPanel.msValue", {
                      value: pulseDurationValue,
                    })}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onPulseDurationChange(pulseDurationValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onPulseDurationChange(pulseDurationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetContinuous}
              className="flex-1"
            >
              {t("feederCalibrationPanel.continuousFeedButton")}
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetPulseDuration}
              className="flex-1"
            >
              {t("feederCalibrationPanel.setPulseDuration")}
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {calibration.pulseDuration <= 0
                ? t("feederCalibrationPanel.continuous")
                : t("feederCalibrationPanel.msValue", {
                    value: calibration.pulseDuration,
                  })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {t("feederCalibrationPanel.pauseDurationLabel")}
          </p>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected || pauseDurationValue <= 0}
              onClick={() =>
                onPauseDurationChange(Math.max(0, pauseDurationValue - 10))
              }
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || pauseDurationValue <= 0}
              onClick={() =>
                onPauseDurationChange(Math.max(0, pauseDurationValue - 1))
              }
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">
                {t("feederCalibrationPanel.msValue", {
                  value: pauseDurationValue,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onPauseDurationChange(pauseDurationValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onPauseDurationChange(pauseDurationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetPauseDuration}
              className="flex-1"
            >
              {t("feederCalibrationPanel.setPauseDuration")}
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {t("feederCalibrationPanel.msValue", {
                value: calibration.pauseDuration,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {t("feederCalibrationPanel.settleDurationLabel")}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            {t("feederCalibrationPanel.settleDurationDescription")}
          </p>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected || settleDurationValue <= 0}
              onClick={() =>
                onSettleDurationChange(Math.max(0, settleDurationValue - 10))
              }
              className="px-2 text-xs"
            >
              -10
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || settleDurationValue <= 0}
              onClick={() =>
                onSettleDurationChange(Math.max(0, settleDurationValue - 1))
              }
              className="px-2"
            >
              -
            </Button>
            <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
              <p className="font-bold text-sm">
                {t("feederCalibrationPanel.msValue", {
                  value: settleDurationValue,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onSettleDurationChange(settleDurationValue + 1)}
              className="px-2"
            >
              +
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={() => onSettleDurationChange(settleDurationValue + 10)}
              className="px-2 text-xs"
            >
              +10
            </Button>
          </ButtonGroup>
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSetSettleDuration}
              className="flex-1"
            >
              {t("feederCalibrationPanel.setSettleDuration")}
            </Button>
          </ButtonGroup>
          {isLoading ? (
            <Skeleton className="h-3 w-16 rounded" />
          ) : calibration ? (
            <p className="text-xs text-muted-foreground text-center">
              {t("feederCalibrationPanel.msValue", {
                value: calibration.settleDuration,
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
