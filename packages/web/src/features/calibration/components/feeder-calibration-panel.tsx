import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FEEDER_DURATION_SLIDER_MAX,
  FEEDER_PAUSE_DURATION_SLIDER_MAX,
  FEEDER_PULSE_DURATION_SLIDER_MAX,
  FEEDER_SETTLE_DURATION_SLIDER_MAX,
  pulseToDirectionalSpeed,
  pulseToSignedPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  signedPercentToPulse,
  sliderMax,
} from "@/lib/constants/calibration";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RawStepperRowProps {
  value: number;
  min: number;
  max?: number;
  bigStep: number;
  smallStep: number;
  disabled: boolean;
  onChange: (value: number) => void;
  renderValue: () => React.ReactNode;
}

// The exact-value fallback for every feeder field: coarse/fine step buttons
// either side of a readout, only shown once "Advanced" is toggled on.
function RawStepperRow({
  value,
  min,
  max,
  bigStep,
  smallStep,
  disabled,
  onChange,
  renderValue,
}: RawStepperRowProps) {
  const clamp = (v: number) =>
    Math.max(min, max != null ? Math.min(max, v) : v);
  return (
    <ButtonGroup className="w-full">
      <Button
        variant="outline"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - bigStep))}
        className="px-2 text-xs"
      >
        -{bigStep}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - smallStep))}
        className="px-2 text-xs"
      >
        -{smallStep}
      </Button>
      <div className="flex flex-row flex-1 bg-background border-y justify-center px-2 items-center">
        {renderValue()}
      </div>
      <Button
        variant="outline"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + smallStep))}
        className="px-2 text-xs"
      >
        +{smallStep}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + bigStep))}
        className="px-2 text-xs"
      >
        +{bigStep}
      </Button>
    </ButtonGroup>
  );
}

interface FeederCalibrationPanelProps {
  speedValue: number;
  durationValue: number;
  pulseDurationValue: number;
  pauseDurationValue: number;
  settleDurationValue: number;
  isConnected: boolean;
  canCalibrate: boolean;
  onSpeedChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onPulseDurationChange: (value: number) => void;
  onPauseDurationChange: (value: number) => void;
  onSettleDurationChange: (value: number) => void;
  onSelectContinuous: () => void;
}

export function FeederCalibrationPanel({
  speedValue,
  durationValue,
  pulseDurationValue,
  pauseDurationValue,
  settleDurationValue,
  isConnected,
  canCalibrate,
  onSpeedChange,
  onDurationChange,
  onPulseDurationChange,
  onPauseDurationChange,
  onSettleDurationChange,
  onSelectContinuous,
}: FeederCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const speedSigned = pulseToSignedPercent(speedValue);
  const speed = pulseToDirectionalSpeed(speedValue);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3"
      data-tour="feeder-calibration-panel"
    >
      <div className="rounded-lg border bg-sidebar p-2 flex flex-col gap-5 col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold font-heading">
            {t("feederCalibrationPanel.heading")}
          </h2>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconChevronDown
              size={12}
              className={showAdvanced ? "rotate-180" : undefined}
            />
            {showAdvanced
              ? t("feederCalibrationPanel.hideAdvanced")
              : t("feederCalibrationPanel.showAdvanced")}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground w-fit">
                    {t("feederCalibrationPanel.speedLabel")}
                  </p>
                  <span className="text-sm font-bold">
                    {t(`feederCalibrationPanel.${speed.direction}`)}{" "}
                    {speed.magnitude}%
                  </span>
                </div>
              }
            />
            <TooltipContent>
              {t("feederCalibrationPanel.speedTooltip")}
            </TooltipContent>
          </Tooltip>
          <Slider
            min={-100}
            max={100}
            step={1}
            disabled={!canCalibrate}
            value={speedSigned}
            onValueChange={(value) =>
              onSpeedChange(signedPercentToPulse(value))
            }
          />
          {showAdvanced && (
            <RawStepperRow
              value={speedValue}
              min={SERVO_PULSE_MIN}
              max={SERVO_PULSE_MAX}
              bigStep={10}
              smallStep={1}
              disabled={!canCalibrate}
              onChange={onSpeedChange}
              renderValue={() => (
                <p className="font-bold text-sm">{speedValue}</p>
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("feederCalibrationPanel.timeoutLabel")}
            </p>
            <span className="text-sm font-bold">
              {t("msValue", { value: durationValue })}
            </span>
          </div>
          <Slider
            min={10}
            max={sliderMax(durationValue, FEEDER_DURATION_SLIDER_MAX)}
            step={10}
            disabled={!isConnected}
            value={durationValue}
            onValueChange={onDurationChange}
          />
          {showAdvanced && (
            <RawStepperRow
              value={durationValue}
              min={10}
              bigStep={100}
              smallStep={10}
              disabled={!isConnected}
              onChange={onDurationChange}
              renderValue={() => (
                <p className="font-bold text-sm">
                  {t("msValue", {
                    value: durationValue,
                  })}
                </p>
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("feederCalibrationPanel.pulseDurationLabel")}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {pulseDurationValue <= 0
                ? t("continuous")
                : t("msValue", {
                    value: pulseDurationValue,
                  })}
            </p>
          </div>
          <Slider
            min={0}
            max={sliderMax(
              pulseDurationValue,
              FEEDER_PULSE_DURATION_SLIDER_MAX,
            )}
            step={1}
            disabled={!isConnected}
            value={pulseDurationValue}
            onValueChange={onPulseDurationChange}
          />
          {showAdvanced && (
            <RawStepperRow
              value={pulseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
              onChange={onPulseDurationChange}
              renderValue={() => (
                <p className="font-bold text-sm">
                  {pulseDurationValue <= 0
                    ? t("continuous")
                    : t("msValue", {
                        value: pulseDurationValue,
                      })}
                </p>
              )}
            />
          )}
          <ButtonGroup className="w-full">
            <Button
              variant="outline"
              disabled={!isConnected}
              onClick={onSelectContinuous}
              className="flex-1"
            >
              {t("feederCalibrationPanel.continuousFeedButton")}
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("feederCalibrationPanel.pauseDurationLabel")}
            </p>
            <span className="text-sm font-bold">
              {t("msValue", {
                value: pauseDurationValue,
              })}
            </span>
          </div>
          <Slider
            min={0}
            max={sliderMax(
              pauseDurationValue,
              FEEDER_PAUSE_DURATION_SLIDER_MAX,
            )}
            step={1}
            disabled={!isConnected}
            value={pauseDurationValue}
            onValueChange={onPauseDurationChange}
          />
          {showAdvanced && (
            <RawStepperRow
              value={pauseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
              onChange={onPauseDurationChange}
              renderValue={() => (
                <p className="font-bold text-sm">
                  {t("msValue", {
                    value: pauseDurationValue,
                  })}
                </p>
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("feederCalibrationPanel.settleDurationLabel")}
            </p>
            <span className="text-sm font-bold">
              {t("msValue", {
                value: settleDurationValue,
              })}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            {t("feederCalibrationPanel.settleDurationDescription")}
          </p>
          <Slider
            min={0}
            max={sliderMax(
              settleDurationValue,
              FEEDER_SETTLE_DURATION_SLIDER_MAX,
            )}
            step={1}
            disabled={!isConnected}
            value={settleDurationValue}
            onValueChange={onSettleDurationChange}
          />
          {showAdvanced && (
            <RawStepperRow
              value={settleDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
              onChange={onSettleDurationChange}
              renderValue={() => (
                <p className="font-bold text-sm">
                  {t("msValue", {
                    value: settleDurationValue,
                  })}
                </p>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
