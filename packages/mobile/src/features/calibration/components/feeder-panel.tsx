import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  FEED_RETRY_COUNT_MAX,
  FEED_RETRY_COUNT_MIN,
  FIRMWARE_FEATURE_MIN_VERSIONS,
  isFirmwareFeatureSupported,
  pulseToDirectionalSpeed,
  pulseToSignedPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  signedPercentToPulse,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SliderField } from "@/components/ui/slider-field";
import { StepperRow } from "@/components/ui/stepper-row";
import { Surface } from "@/components/ui/surface";
import {
  FEEDER_DURATION_SLIDER_MAX,
  FEEDER_PAUSE_DURATION_SLIDER_MAX,
  FEEDER_PULSE_DURATION_SLIDER_MAX,
  FEEDER_REVERSE_DURATION_SLIDER_MAX,
  FEEDER_SETTLE_DURATION_SLIDER_MAX,
  sliderMax,
} from "@/lib/constants/calibration";
import { SPACING } from "@/lib/constants/theme";
import type { FeederPanelProps } from "@/lib/interfaces/calibration";

export function FeederPanel({ state, firmwareVersion }: FeederPanelProps) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const values = state.feederValues;
  const disabled = !state.canCalibrate;
  const ms = (value: number) => t("calibration.msValue", { value });
  const speedLabel = (pulse: number) => {
    const speed = pulseToDirectionalSpeed(pulse);
    return `${t(`calibration.feeder.${speed.direction}`)} ${speed.magnitude}%`;
  };
  const rollbackSupported = isFirmwareFeatureSupported(firmwareVersion, "feederRollback");

  const timing = (
    field: "duration" | "pulseDuration" | "pauseDuration" | "settleDuration" | "reverseDuration",
    labelKey: string,
    min: number,
    max: number,
    valueLabel: string,
    description?: string,
  ) => (
    <SliderField
      label={t(labelKey)}
      description={description}
      valueLabel={valueLabel}
      accessibilityLabel={t(labelKey)}
      min={min}
      max={sliderMax(values[field], max)}
      step={10}
      disabled={disabled}
      value={values[field]}
      onValueChange={(value) => state.handleFeederChange(field, value)}
    >
      {advanced ? (
        <StepperRow
          value={values[field]}
          min={min}
          bigStep={10}
          smallStep={1}
          disabled={disabled}
          valueLabel={valueLabel}
          onChange={(value) => state.handleFeederChange(field, value)}
        />
      ) : null}
    </SliderField>
  );

  const speed = (field: "speed" | "reverseSpeed", labelKey: string, description?: string) => (
    <SliderField
      label={t(labelKey)}
      description={description}
      valueLabel={speedLabel(values[field])}
      accessibilityLabel={t(labelKey)}
      min={-100}
      max={100}
      disabled={disabled}
      value={pulseToSignedPercent(values[field])}
      onValueChange={(value) => state.handleFeederChange(field, signedPercentToPulse(value))}
    >
      {advanced ? (
        <StepperRow
          value={values[field]}
          min={SERVO_PULSE_MIN}
          max={SERVO_PULSE_MAX}
          bigStep={10}
          smallStep={1}
          disabled={disabled}
          valueLabel={String(values[field])}
          onChange={(value) => state.handleFeederChange(field, value)}
        />
      ) : null}
    </SliderField>
  );

  return (
    <Surface style={{ gap: SPACING.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText heading weight="semibold">
          {t("calibration.feeder.heading")}
        </AppText>
        <Button
          size="sm"
          variant="ghost"
          label={advanced ? t("calibration.feeder.hideAdvanced") : t("calibration.feeder.showAdvanced")}
          onPress={() => setAdvanced((value) => !value)}
        />
      </View>
      {speed("speed", "calibration.feeder.speedLabel", t("calibration.feeder.speedTooltip"))}
      {timing("duration", "calibration.feeder.timeoutLabel", 10, FEEDER_DURATION_SLIDER_MAX, ms(values.duration))}
      <SliderField
        label={t("calibration.feeder.feedRetryCountLabel")}
        description={t("calibration.feeder.feedRetryCountDescription")}
        valueLabel={values.feedRetryCount === 0 ? t("calibration.feeder.off") : String(values.feedRetryCount)}
        accessibilityLabel={t("calibration.feeder.feedRetryCountLabel")}
        min={FEED_RETRY_COUNT_MIN}
        max={FEED_RETRY_COUNT_MAX}
        step={1}
        value={values.feedRetryCount}
        onValueChange={(value) => state.handleFeederChange("feedRetryCount", value)}
      />
      <View style={{ gap: SPACING.sm }}>
        {timing(
          "pulseDuration",
          "calibration.feeder.pulseDurationLabel",
          0,
          FEEDER_PULSE_DURATION_SLIDER_MAX,
          values.pulseDuration <= 0 ? t("calibration.continuous") : ms(values.pulseDuration),
        )}
        <Button
          size="sm"
          variant="secondary"
          label={t("calibration.feeder.continuousFeedButton")}
          disabled={disabled || values.pulseDuration <= 0}
          onPress={() => state.handleFeederChange("pulseDuration", 0)}
        />
      </View>
      {timing("pauseDuration", "calibration.feeder.pauseDurationLabel", 0, FEEDER_PAUSE_DURATION_SLIDER_MAX, ms(values.pauseDuration))}
      {timing(
        "settleDuration",
        "calibration.feeder.settleDurationLabel",
        0,
        FEEDER_SETTLE_DURATION_SLIDER_MAX,
        ms(values.settleDuration),
        t("calibration.feeder.settleDurationDescription"),
      )}
      {rollbackSupported ? (
        <>
          {timing(
            "reverseDuration",
            "calibration.feeder.reverseDurationLabel",
            0,
            FEEDER_REVERSE_DURATION_SLIDER_MAX,
            values.reverseDuration <= 0 ? t("calibration.feeder.off") : ms(values.reverseDuration),
            t("calibration.feeder.reverseDurationDescription"),
          )}
          {values.reverseDuration > 0 ? speed("reverseSpeed", "calibration.feeder.reverseSpeedLabel") : null}
        </>
      ) : (
        <AppText size="xs" tone="secondary">
          {`${t("calibration.feeder.reverseDurationLabel")}: ${t("calibration.firmwareRequired", {
            version: FIRMWARE_FEATURE_MIN_VERSIONS.feederRollback,
          })}`}
        </AppText>
      )}
    </Surface>
  );
}
