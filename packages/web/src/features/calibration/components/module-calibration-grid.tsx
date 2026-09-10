import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SERVOS } from "@/lib/constants/calibration";
import type {
  ActivePositions,
  ServoConfig,
  SliderKey,
} from "@/features/calibration/types";
import type { ModuleConfig, ServoCalibration } from "@magic-vault/shared";
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
  const positionLabel = (position: string) =>
    t(`moduleCalibrationGrid.positions.${position}`).toUpperCase();

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

      <ButtonGroup className="w-full">
        <Button
          variant="outline"
          disabled={!isConnected || sliderValue <= 120}
          onClick={() =>
            onSliderChange(module, servo.name, Math.max(120, sliderValue - 10))
          }
          className="px-2 text-xs"
        >
          -10
        </Button>
        <Button
          variant="outline"
          disabled={!isConnected || sliderValue <= 120}
          onClick={() => onSliderChange(module, servo.name, sliderValue - 1)}
          className="px-2"
        >
          -
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex flex-row flex-1 bg-background border-y justify-between px-2 items-center">
                <p className="text-xs text-muted-foreground">120</p>
                <p className="font-bold text-sm">{sliderValue}</p>
                <p className="text-xs text-muted-foreground">490</p>
              </div>
            }
          />
          <TooltipContent>
            {t("moduleCalibrationGrid.sliderTooltip")}
          </TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          disabled={!isConnected || sliderValue >= 490}
          onClick={() => onSliderChange(module, servo.name, sliderValue + 1)}
          className="px-2"
        >
          +
        </Button>
        <Button
          variant="outline"
          disabled={!isConnected || sliderValue >= 490}
          onClick={() =>
            onSliderChange(module, servo.name, Math.min(490, sliderValue + 10))
          }
          className="px-2 text-xs"
        >
          +10
        </Button>
      </ButtonGroup>

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
              {calibration[pos.key]}
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
