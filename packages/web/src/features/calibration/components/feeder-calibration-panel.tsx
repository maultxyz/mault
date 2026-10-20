import { FirmwareFeatureGate } from "@/components/firmware-feature-gate";
import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { RawStepperRow } from "@/features/calibration/components/raw-stepper-row";
import {
  FEEDER_DURATION_SLIDER_MAX,
  FEEDER_PAUSE_DURATION_SLIDER_MAX,
  FEEDER_PULSE_DURATION_SLIDER_MAX,
  FEEDER_REVERSE_DURATION_SLIDER_MAX,
  FEEDER_SETTLE_DURATION_SLIDER_MAX,
  FEEDER_STOP_PULSE_SLIDER_RANGE,
  pulseToDirectionalSpeed,
  pulseToSignedPercent,
  SERVO_PULSE_CENTER,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  signedPercentToPulse,
  sliderMax,
} from "@/lib/constants/calibration";
import type { FeederCalibrationPanelProps } from "@/lib/interfaces/calibration";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconRestore } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FeederCalibrationPanel({
  speedValue,
  durationValue,
  pulseDurationValue,
  pauseDurationValue,
  settleDurationValue,
  reverseSpeedValue,
  reverseDurationValue,
  stopPulse,
  canEditTimings,
  canCalibrate,
  onSpeedChange,
  onStopPulseChange,
  onResetStopPulse,
  onDurationChange,
  onPulseDurationChange,
  onPauseDurationChange,
  onSettleDurationChange,
  onReverseSpeedChange,
  onReverseDurationChange,
  onSelectContinuous,
  fullWidth = false,
}: FeederCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const center = stopPulse ?? SERVO_PULSE_CENTER;
  const speed = pulseToDirectionalSpeed(speedValue, center);
  const reverseSpeed = pulseToDirectionalSpeed(reverseSpeedValue, center);
  const ms = (value: number) => t("msValue", { value });
  const speedLabel = (s: typeof speed) =>
    `${t(`feederCalibrationPanel.${s.direction}`)} ${s.magnitude}%`;
  const pulseLabel =
    pulseDurationValue <= 0 ? t("continuous") : ms(pulseDurationValue);
  const reverseLabel =
    reverseDurationValue <= 0
      ? t("feederCalibrationPanel.off")
      : ms(reverseDurationValue);

  return (
    <div
      className={cn("grid grid-cols-1", !fullWidth && "md:grid-cols-3")}
      data-tour="feeder-calibration-panel"
    >
      <div
        className={cn(
          "flex flex-col gap-5",
          !fullWidth && "col-span-2 lg:col-span-1",
        )}
      >
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors"
          >
            <IconChevronDown
              className={showAdvanced ? "size-3 rotate-180" : "size-3"}
            />
            {showAdvanced
              ? t("feederCalibrationPanel.hideAdvanced")
              : t("feederCalibrationPanel.showAdvanced")}
          </button>
        </div>

        <SliderField
          label={t("feederCalibrationPanel.speedLabel")}
          description={t("feederCalibrationPanel.speedTooltip")}
          valueLabel={speedLabel(speed)}
          min={-100}
          max={100}
          disabled={!canCalibrate}
          value={pulseToSignedPercent(speedValue, center)}
          onValueChange={(value) =>
            onSpeedChange(signedPercentToPulse(value, center))
          }
        >
          {showAdvanced && (
            <RawStepperRow
              value={speedValue}
              min={SERVO_PULSE_MIN}
              max={SERVO_PULSE_MAX}
              bigStep={10}
              smallStep={1}
              disabled={!canCalibrate}
              onChange={onSpeedChange}
              valueLabel={speedValue}
            />
          )}
        </SliderField>

        <SliderField
          label={t("feederCalibrationPanel.stopPulseLabel")}
          description={t("feederCalibrationPanel.stopPulseDescription")}
          valueLabel={
            stopPulse === null
              ? t("feederCalibrationPanel.stopPulseDefault", {
                  pulse: SERVO_PULSE_CENTER,
                })
              : stopPulse
          }
          min={SERVO_PULSE_CENTER - FEEDER_STOP_PULSE_SLIDER_RANGE}
          max={SERVO_PULSE_CENTER + FEEDER_STOP_PULSE_SLIDER_RANGE}
          disabled={!canCalibrate}
          value={center}
          onValueChange={onStopPulseChange}
        >
          <RawStepperRow
            value={center}
            min={SERVO_PULSE_MIN}
            max={SERVO_PULSE_MAX}
            bigStep={10}
            smallStep={1}
            disabled={!canCalibrate}
            onChange={onStopPulseChange}
            valueLabel={center}
          />
          {stopPulse !== null && (
            <Button
              variant="outline"
              disabled={!canCalibrate}
              onClick={onResetStopPulse}
              className="w-full"
            >
              <IconRestore />
              {t("feederCalibrationPanel.resetStopPulse")}
            </Button>
          )}
        </SliderField>

        <SliderField
          label={t("feederCalibrationPanel.timeoutLabel")}
          valueLabel={ms(durationValue)}
          min={10}
          max={sliderMax(durationValue, FEEDER_DURATION_SLIDER_MAX)}
          step={10}
          disabled={!canEditTimings}
          value={durationValue}
          onValueChange={onDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={durationValue}
              min={10}
              bigStep={100}
              smallStep={10}
              disabled={!canEditTimings}
              onChange={onDurationChange}
              valueLabel={ms(durationValue)}
            />
          )}
        </SliderField>

        <SliderField
          label={t("feederCalibrationPanel.pulseDurationLabel")}
          valueLabel={pulseLabel}
          min={0}
          max={sliderMax(pulseDurationValue, FEEDER_PULSE_DURATION_SLIDER_MAX)}
          disabled={!canEditTimings}
          value={pulseDurationValue}
          onValueChange={onPulseDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={pulseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!canEditTimings}
              onChange={onPulseDurationChange}
              valueLabel={pulseLabel}
            />
          )}
          <Button
            variant="outline"
            disabled={!canEditTimings}
            onClick={onSelectContinuous}
            className="w-full"
          >
            {t("feederCalibrationPanel.continuousFeedButton")}
          </Button>
        </SliderField>

        <SliderField
          label={t("feederCalibrationPanel.pauseDurationLabel")}
          valueLabel={ms(pauseDurationValue)}
          min={0}
          max={sliderMax(pauseDurationValue, FEEDER_PAUSE_DURATION_SLIDER_MAX)}
          disabled={!canEditTimings}
          value={pauseDurationValue}
          onValueChange={onPauseDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={pauseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!canEditTimings}
              onChange={onPauseDurationChange}
              valueLabel={ms(pauseDurationValue)}
            />
          )}
        </SliderField>

        <SliderField
          label={t("feederCalibrationPanel.settleDurationLabel")}
          description={t("feederCalibrationPanel.settleDurationDescription")}
          valueLabel={ms(settleDurationValue)}
          min={0}
          max={sliderMax(
            settleDurationValue,
            FEEDER_SETTLE_DURATION_SLIDER_MAX,
          )}
          disabled={!canEditTimings}
          value={settleDurationValue}
          onValueChange={onSettleDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={settleDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!canEditTimings}
              onChange={onSettleDurationChange}
              valueLabel={ms(settleDurationValue)}
            />
          )}
        </SliderField>

        <FirmwareFeatureGate
          feature="feederRollback"
          className="flex flex-col gap-5"
        >
          <SliderField
            label={t("feederCalibrationPanel.reverseDurationLabel")}
            description={t("feederCalibrationPanel.reverseDurationDescription")}
            valueLabel={reverseLabel}
            min={0}
            max={sliderMax(
              reverseDurationValue,
              FEEDER_REVERSE_DURATION_SLIDER_MAX,
            )}
            disabled={!canEditTimings}
            value={reverseDurationValue}
            onValueChange={onReverseDurationChange}
          >
            {showAdvanced && (
              <RawStepperRow
                value={reverseDurationValue}
                min={0}
                bigStep={10}
                smallStep={1}
                disabled={!canEditTimings}
                onChange={onReverseDurationChange}
                valueLabel={reverseLabel}
              />
            )}
          </SliderField>
          {reverseDurationValue > 0 && (
            <SliderField
              label={t("feederCalibrationPanel.reverseSpeedLabel")}
              valueLabel={speedLabel(reverseSpeed)}
              min={-100}
              max={100}
              disabled={!canCalibrate}
              value={pulseToSignedPercent(reverseSpeedValue, center)}
              onValueChange={(value) =>
                onReverseSpeedChange(signedPercentToPulse(value, center))
              }
            >
              {showAdvanced && (
                <RawStepperRow
                  value={reverseSpeedValue}
                  min={SERVO_PULSE_MIN}
                  max={SERVO_PULSE_MAX}
                  bigStep={10}
                  smallStep={1}
                  disabled={!canCalibrate}
                  onChange={onReverseSpeedChange}
                  valueLabel={reverseSpeedValue}
                />
              )}
            </SliderField>
          )}
        </FirmwareFeatureGate>
      </div>
    </div>
  );
}
