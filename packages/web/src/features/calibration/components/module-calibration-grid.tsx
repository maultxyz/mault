import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  percentToPulse,
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD,
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT,
  pulseToPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  SERVOS,
} from "@/lib/constants/calibration";
import type {
  ActivePositions,
  ServoConfig,
  SliderKey,
} from "@/lib/interfaces/calibration";
import type { ModuleConfig, ServoCalibration } from "@magic-vault/shared";
import { IconAlertTriangle, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ServoControlProps {
  module: number;
  servo: ServoConfig;
  sliderValue: number;
  activePosition: string | null | undefined;
  calibration: ServoCalibration | undefined;
  isLoading: boolean;
  isConnected: boolean;
  onControl: (
    module: number,
    servo: "bottom" | "paddle" | "pusher",
    position: string,
  ) => void;
  onSliderChange: (
    module: number,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
  onSetPosition: (
    module: number,
    posKey: keyof ServoCalibration,
    value: number,
  ) => void;
}

function ServoControl({
  module,
  servo,
  sliderValue,
  activePosition,
  calibration,
  isLoading,
  isConnected,
  onControl,
  onSliderChange,
  onSetPosition,
}: ServoControlProps) {
  const { t } = useTranslation("calibration");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const positionLabel = (position: string) =>
    t(`moduleCalibrationGrid.positions.${position}`).toUpperCase();

  const showPusherOffsetWarning =
    servo.name === "pusher" &&
    calibration != null &&
    Math.abs(sliderValue - calibration.pusherNeutral) >
      PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD;

  const percent = pulseToPercent(sliderValue);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t(servo.labelKey)}</p>

      <ButtonGroup className="w-full">
        {servo.controlPositions.map((position) => (
          <Button
            key={position}
            variant={activePosition === position ? "default" : "outline"}
            disabled={!isConnected}
            onClick={() => onControl(module, servo.name, position)}
            className="flex-1"
          >
            {positionLabel(position)}
          </Button>
        ))}
      </ButtonGroup>

      {showPusherOffsetWarning && (
        <p className="flex items-start gap-1.5 text-xs/relaxed text-amber-800 dark:text-amber-400">
          <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
          {t("moduleCalibrationGrid.pusherOffsetWarning", {
            percent: PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT,
          })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("moduleCalibrationGrid.positionLabel")}
                </span>
                <span className="text-sm font-bold">{percent}%</span>
              </div>
            }
          />
          <TooltipContent>
            {t("moduleCalibrationGrid.percentSliderTooltip")}
          </TooltipContent>
        </Tooltip>
        <Slider
          min={0}
          max={100}
          step={1}
          disabled={!isConnected}
          value={percent}
          onValueChange={(value) =>
            onSliderChange(module, servo.name, percentToPulse(value))
          }
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="self-start flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconChevronDown
          size={12}
          className={showAdvanced ? "rotate-180" : undefined}
        />
        {showAdvanced
          ? t("moduleCalibrationGrid.hideAdvanced")
          : t("moduleCalibrationGrid.showAdvanced")}
      </button>

      {showAdvanced && (
        <ButtonGroup className="w-full">
          <Button
            variant="outline"
            disabled={!isConnected || sliderValue <= SERVO_PULSE_MIN}
            onClick={() =>
              onSliderChange(
                module,
                servo.name,
                Math.max(SERVO_PULSE_MIN, sliderValue - 10),
              )
            }
            className="px-2 text-xs"
          >
            -10
          </Button>
          <Button
            variant="outline"
            disabled={!isConnected || sliderValue <= SERVO_PULSE_MIN}
            onClick={() => onSliderChange(module, servo.name, sliderValue - 1)}
            className="px-2"
          >
            -
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex flex-row flex-1 bg-background border-y justify-between px-2 items-center">
                  <p className="text-xs text-muted-foreground">
                    {SERVO_PULSE_MIN}
                  </p>
                  <p className="font-bold text-sm">{sliderValue}</p>
                  <p className="text-xs text-muted-foreground">
                    {SERVO_PULSE_MAX}
                  </p>
                </div>
              }
            />
            <TooltipContent>
              {t("moduleCalibrationGrid.rawPulseTooltip")}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            disabled={!isConnected || sliderValue >= SERVO_PULSE_MAX}
            onClick={() => onSliderChange(module, servo.name, sliderValue + 1)}
            className="px-2"
          >
            +
          </Button>
          <Button
            variant="outline"
            disabled={!isConnected || sliderValue >= SERVO_PULSE_MAX}
            onClick={() =>
              onSliderChange(
                module,
                servo.name,
                Math.min(SERVO_PULSE_MAX, sliderValue + 10),
              )
            }
            className="px-2 text-xs"
          >
            +10
          </Button>
        </ButtonGroup>
      )}

      <ButtonGroup className="w-full">
        {servo.calibrationPositions.map((pos) => (
          <Button
            key={pos.key}
            variant="outline"
            disabled={!isConnected}
            onClick={() => onSetPosition(module, pos.key, sliderValue)}
            className="flex-1"
          >
            {t(pos.labelKey)}
          </Button>
        ))}
      </ButtonGroup>

      {isLoading ? (
        <Skeleton className="h-3 w-32 rounded" />
      ) : calibration ? (
        <div className="text-xs text-muted-foreground w-full flex">
          {servo.calibrationPositions.map((pos) => (
            <p className="flex-1 text-center" key={pos.key}>
              {showAdvanced
                ? calibration[pos.key]
                : `${pulseToPercent(calibration[pos.key])}%`}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ModuleCalibrationGridProps {
  modules: number[];
  configs: ModuleConfig[];
  active: ActivePositions;
  sliderValues: Record<SliderKey, number>;
  isLoading: boolean;
  isConnected: boolean;
  onControl: (
    module: number,
    servo: "bottom" | "paddle" | "pusher",
    position: string,
  ) => void;
  onSliderChange: (
    module: number,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
  onSetPosition: (
    module: number,
    posKey: keyof ServoCalibration,
    value: number,
  ) => void;
}

export function ModuleCalibrationGrid({
  modules,
  configs,
  active,
  sliderValues,
  isLoading,
  isConnected,
  onControl,
  onSliderChange,
  onSetPosition,
}: ModuleCalibrationGridProps) {
  const { t } = useTranslation("calibration");
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-lg border bg-border"
      data-tour="module-calibration-grid"
    >
      {modules.map((module) => {
        const cal = configs.find((c) => c.moduleNumber === module)?.calibration;
        return (
          <div key={module} className="p-2 flex flex-col gap-5 bg-sidebar">
            <h2 className="text-sm font-semibold font-heading">
              {t("moduleCalibrationGrid.moduleHeading", { module })}
            </h2>
            {SERVOS.map((servo) => {
              const sliderKey = `${module}:${servo.name}` as SliderKey;
              return (
                <ServoControl
                  key={servo.name}
                  module={module}
                  servo={servo}
                  sliderValue={sliderValues[sliderKey] ?? 307}
                  activePosition={active[sliderKey]}
                  calibration={cal}
                  isLoading={isLoading}
                  isConnected={isConnected}
                  onControl={onControl}
                  onSliderChange={onSliderChange}
                  onSetPosition={onSetPosition}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
