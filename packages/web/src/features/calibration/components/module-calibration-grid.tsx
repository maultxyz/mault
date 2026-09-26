import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCalibrationKey } from "@/features/calibration/lib/calibration-utils";
import { cn } from "@/lib/utils";
import {
  MODULE_DELAY_FIELDS,
  MODULE_DELAY_SLIDER_MAX,
  PUSH_TEST_DIRECTIONS,
  percentToPulse,
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD,
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT,
  pulseToPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  SERVOS,
  sliderMax,
} from "@/lib/constants/calibration";
import type {
  ActivePositions,
  ModuleDelayField,
  ServoConfig,
  SliderKey,
} from "@/lib/interfaces/calibration";
import {
  DEFAULT_CALIBRATION,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ServoControlProps {
  module: number;
  servo: ServoConfig;
  sliderValue: number;
  activePosition: string | null | undefined;
  calibration: ServoCalibration | undefined;
  isLoading: boolean;
  canCalibrate: boolean;
  isTesting: boolean;
  showRaw: boolean;
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
  onTest: (module: number, servo: "bottom" | "paddle" | "pusher") => void;
}

function ServoControl({
  module,
  servo,
  sliderValue,
  activePosition,
  calibration,
  isLoading,
  canCalibrate,
  isTesting,
  showRaw,
  onControl,
  onSliderChange,
  onTest,
}: ServoControlProps) {
  const { t } = useTranslation("calibration");
  const positionLabel = (position: string) =>
    t(`moduleCalibrationGrid.positions.${position}`).toUpperCase();

  const showPusherOffsetWarning =
    servo.name === "pusher" &&
    calibration != null &&
    Math.abs(sliderValue - calibration.pusherNeutral) >
      PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD;

  const percent = pulseToPercent(sliderValue);
  const sliderDisabled = !canCalibrate || !activePosition;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t(servo.labelKey)}</p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={!canCalibrate || !calibration}
                onClick={() => onTest(module, servo.name)}
                className={cn(isTesting && "text-primary")}
              >
                <IconPlayerPlay />
              </Button>
            }
          />
          <TooltipContent>
            {t(
              servo.name === "pusher"
                ? "moduleCalibrationGrid.testServoTooltipPusher"
                : "moduleCalibrationGrid.testServoTooltipGate",
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {isLoading ? (
        <Skeleton className="h-4 w-full rounded" />
      ) : calibration ? (
        <div className="flex w-full">
          {servo.positions.map((position) => {
            const key = getCalibrationKey(servo.name, position);
            if (!key) return null;
            return (
              <p key={position} className="flex-1 text-center text-sm font-bold">
                {showRaw
                  ? calibration[key]
                  : `${pulseToPercent(calibration[key])}%`}
              </p>
            );
          })}
        </div>
      ) : null}

      <ButtonGroup className="w-full">
        {servo.positions.map((position) => (
          <Button
            key={position}
            variant={activePosition === position ? "outline-selected" : "outline"}
            disabled={!canCalibrate}
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {activePosition
              ? t("moduleCalibrationGrid.editingPosition", {
                  position: positionLabel(activePosition),
                })
              : t("moduleCalibrationGrid.noPositionSelected")}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={<span className="text-sm font-bold">{percent}%</span>}
            />
            <TooltipContent>
              {t("moduleCalibrationGrid.percentSliderTooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          disabled={sliderDisabled}
          value={percent}
          onValueChange={(value) =>
            onSliderChange(module, servo.name, percentToPulse(value))
          }
        />
      </div>

      {showRaw && (
        <ButtonGroup className="w-full">
          <Button
            variant="outline"
            disabled={sliderDisabled || sliderValue <= SERVO_PULSE_MIN}
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
            disabled={sliderDisabled || sliderValue <= SERVO_PULSE_MIN}
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
            disabled={sliderDisabled || sliderValue >= SERVO_PULSE_MAX}
            onClick={() => onSliderChange(module, servo.name, sliderValue + 1)}
            className="px-2"
          >
            +
          </Button>
          <Button
            variant="outline"
            disabled={sliderDisabled || sliderValue >= SERVO_PULSE_MAX}
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
    </div>
  );
}

interface ModuleDelayControlProps {
  module: number;
  field: ModuleDelayField;
  value: number;
  isConnected: boolean;
  onChange: (module: number, field: ModuleDelayField, value: number) => void;
}

function ModuleDelayControl({
  module,
  field,
  value,
  isConnected,
  onChange,
}: ModuleDelayControlProps) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t(`moduleCalibrationGrid.${field}Label`)}
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="text-sm font-bold">
                {t("msValue", { value })}
              </span>
            }
          />
          <TooltipContent>
            {t(`moduleCalibrationGrid.${field}Description`)}
          </TooltipContent>
        </Tooltip>
      </div>
      <Slider
        min={0}
        max={sliderMax(value, MODULE_DELAY_SLIDER_MAX[field])}
        step={10}
        disabled={!isConnected}
        value={value}
        onValueChange={(v) => onChange(module, field, v)}
      />
    </div>
  );
}

interface PushTestControlProps {
  module: number;
  isReady: boolean;
  isTesting: boolean;
  onTest: (module: number, direction: "left" | "right") => void;
}

function PushTestControl({
  module,
  isReady,
  isTesting,
  onTest,
}: PushTestControlProps) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t("moduleCalibrationGrid.pushTestLabel")}
        </p>
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
            <IconInfoCircle className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {t("moduleCalibrationGrid.pushTestTooltip")}
          </TooltipContent>
        </Tooltip>
      </div>
      <ButtonGroup className="w-full">
        {PUSH_TEST_DIRECTIONS.map((direction) => (
          <Button
            key={direction}
            variant="outline"
            disabled={!isReady || isTesting}
            onClick={() => onTest(module, direction)}
            className="flex-1"
          >
            <IconPlayerPlay />
            {t(`moduleCalibrationGrid.positions.${direction}`).toUpperCase()}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

interface ModuleCalibrationGridProps {
  modules: number[];
  configs: ModuleConfig[];
  active: ActivePositions;
  sliderValues: Record<SliderKey, number>;
  moduleDelayValues: Record<number, Record<ModuleDelayField, number>>;
  pendingCalibration: Record<number, Partial<ServoCalibration>>;
  isLoading: boolean;
  isConnected: boolean;
  isReady: boolean;
  canCalibrate: boolean;
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
  onModuleDelayChange: (
    module: number,
    field: ModuleDelayField,
    value: number,
  ) => void;
  testingServos: Record<SliderKey, boolean>;
  onTest: (module: number, servo: "bottom" | "paddle" | "pusher") => void;
  pushTestingModule: number | null;
  onPushTest: (module: number, direction: "left" | "right") => void;
}

export function ModuleCalibrationGrid({
  modules,
  configs,
  active,
  sliderValues,
  moduleDelayValues,
  pendingCalibration,
  isLoading,
  isConnected,
  isReady,
  canCalibrate,
  onControl,
  onSliderChange,
  onModuleDelayChange,
  testingServos,
  onTest,
  pushTestingModule,
  onPushTest,
}: ModuleCalibrationGridProps) {
  const { t } = useTranslation("calibration");
  const [rawModeByModule, setRawModeByModule] = useState<
    Record<number, boolean>
  >({});

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-lg border bg-border"
      data-tour="module-calibration-grid"
    >
      {modules.map((module) => {
        const cal = configs.find((c) => c.moduleNumber === module)?.calibration;
        const effectiveCal = cal
          ? { ...cal, ...pendingCalibration[module] }
          : cal;
        const showRaw = rawModeByModule[module] ?? false;
        return (
          <div key={module} className="p-2 flex flex-col gap-5 bg-sidebar">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold font-heading">
                {t("moduleLabel", { module })}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {t("moduleCalibrationGrid.rawPulseToggleLabel")}
                </span>
                <Tooltip>
                  <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                    <IconInfoCircle className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("moduleCalibrationGrid.rawPulseTooltip")}
                  </TooltipContent>
                </Tooltip>
                <Switch
                  checked={showRaw}
                  onCheckedChange={(checked) =>
                    setRawModeByModule((prev) => ({
                      ...prev,
                      [module]: checked,
                    }))
                  }
                />
              </div>
            </div>
            {SERVOS.map((servo) => {
              const sliderKey = `${module}:${servo.name}` as SliderKey;
              return (
                <ServoControl
                  key={servo.name}
                  module={module}
                  servo={servo}
                  sliderValue={sliderValues[sliderKey] ?? 307}
                  activePosition={active[sliderKey]}
                  calibration={effectiveCal}
                  isLoading={isLoading}
                  canCalibrate={canCalibrate}
                  isTesting={testingServos[sliderKey] ?? false}
                  showRaw={showRaw}
                  onControl={onControl}
                  onSliderChange={onSliderChange}
                  onTest={onTest}
                />
              );
            })}
            {MODULE_DELAY_FIELDS.map((field) => (
              <ModuleDelayControl
                key={field}
                module={module}
                field={field}
                value={
                  moduleDelayValues[module]?.[field] ??
                  DEFAULT_CALIBRATION[field]
                }
                isConnected={isConnected}
                onChange={onModuleDelayChange}
              />
            ))}
            <PushTestControl
              module={module}
              isReady={isReady}
              isTesting={pushTestingModule !== null}
              onTest={onPushTest}
            />
          </div>
        );
      })}
    </div>
  );
}
