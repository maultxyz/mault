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
  pulseToDirectionalSpeed,
  pulseToSignedPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  signedPercentToPulse,
  sliderMax,
} from "@/lib/constants/calibration";
import type { FeederCalibrationPanelProps } from "@/lib/interfaces/calibration";
import { IconChevronDown } from "@tabler/icons-react";
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
  isConnected,
  canCalibrate,
  onSpeedChange,
  onDurationChange,
  onPulseDurationChange,
  onPauseDurationChange,
  onSettleDurationChange,
  onReverseSpeedChange,
  onReverseDurationChange,
  onSelectContinuous,
}: FeederCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const speed = pulseToDirectionalSpeed(speedValue);
  const reverseSpeed = pulseToDirectionalSpeed(reverseSpeedValue);
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
          value={pulseToSignedPercent(speedValue)}
          onValueChange={(value) => onSpeedChange(signedPercentToPulse(value))}
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
          label={t("feederCalibrationPanel.timeoutLabel")}
          valueLabel={ms(durationValue)}
          min={10}
          max={sliderMax(durationValue, FEEDER_DURATION_SLIDER_MAX)}
          step={10}
          disabled={!isConnected}
          value={durationValue}
          onValueChange={onDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={durationValue}
              min={10}
              bigStep={100}
              smallStep={10}
              disabled={!isConnected}
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
          disabled={!isConnected}
          value={pulseDurationValue}
          onValueChange={onPulseDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={pulseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
              onChange={onPulseDurationChange}
              valueLabel={pulseLabel}
            />
          )}
          <Button
            variant="outline"
            disabled={!isConnected}
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
          disabled={!isConnected}
          value={pauseDurationValue}
          onValueChange={onPauseDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={pauseDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
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
          disabled={!isConnected}
          value={settleDurationValue}
          onValueChange={onSettleDurationChange}
        >
          {showAdvanced && (
            <RawStepperRow
              value={settleDurationValue}
              min={0}
              bigStep={10}
              smallStep={1}
              disabled={!isConnected}
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
            disabled={!isConnected}
            value={reverseDurationValue}
            onValueChange={onReverseDurationChange}
          >
            {showAdvanced && (
              <RawStepperRow
                value={reverseDurationValue}
                min={0}
                bigStep={10}
                smallStep={1}
                disabled={!isConnected}
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
              value={pulseToSignedPercent(reverseSpeedValue)}
              onValueChange={(value) =>
                onReverseSpeedChange(signedPercentToPulse(value))
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
