import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { StepperRow } from "@/components/ui/stepper-row";
import { getCalibrationKey } from "@/features/calibration/lib/calibration-keys";
import { useTheme } from "@/hooks/use-theme";
import {
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD,
  PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT,
} from "@/lib/constants/calibration";
import { CONTROL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY } from "@/lib/constants/ui";
import type { ServoControlProps } from "@/lib/interfaces/calibration";
import {
  percentToPulse,
  pulseToPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
} from "@magic-vault/shared";

export function ServoControl({
  module,
  servo,
  sliderValue,
  activePosition,
  calibration,
  canCalibrate,
  isTesting,
  showRaw,
  onControl,
  onSliderChange,
  onTest,
}: ServoControlProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const positionLabel = (position: string) => t(`calibration.positions.${position}`).toUpperCase();
  const sliderDisabled = !canCalibrate || !activePosition;
  const showPusherWarning =
    servo.name === "pusher" &&
    calibration != null &&
    Math.abs(sliderValue - calibration.pusherNeutral) > PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD;

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText size="xs" tone="secondary">
          {t(`calibration.servos.${servo.name}`)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(servo.name === "pusher" ? "calibration.testServoPusher" : "calibration.testServoGate")}
          accessibilityState={{ disabled: !canCalibrate || !calibration, busy: isTesting }}
          disabled={!canCalibrate || !calibration}
          onPress={() => onTest(module, servo.name)}
          hitSlop={SPACING.sm}
          style={({ pressed }) => ({
            width: 28,
            height: 28,
            borderRadius: CONTROL_RADIUS,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? colors.muted : "transparent",
            opacity: !canCalibrate || !calibration ? DISABLED_OPACITY : 1,
          })}
        >
          <Icon name="play" size={14} color={isTesting ? colors.primaryText : colors.foregroundSecondary} />
        </Pressable>
      </View>

      {calibration ? (
        <View style={{ flexDirection: "row" }}>
          {servo.positions.map((position) => {
            const key = getCalibrationKey(servo.name, position);
            return key ? (
              <AppText key={position} weight="bold" style={{ flex: 1, textAlign: "center" }}>
                {showRaw ? String(calibration[key]) : `${pulseToPercent(calibration[key])}%`}
              </AppText>
            ) : null;
          })}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          borderRadius: RADIUS.md,
          backgroundColor: colors.muted,
          padding: 2,
          gap: 2,
          overflow: "hidden",
          opacity: canCalibrate ? 1 : DISABLED_OPACITY,
        }}
      >
        {servo.positions.map((position) => {
          const selected = activePosition === position;
          return (
            <Pressable
              key={position}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !canCalibrate }}
              disabled={!canCalibrate}
              onPress={() => onControl(module, servo.name, position)}
              style={({ pressed }) => ({
                flex: 1,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: RADIUS.md - 2,
                backgroundColor: selected ? colors.primarySelected : pressed ? colors.tonal : "transparent",
              })}
            >
              <AppText size="xs" weight="semibold" style={{ color: selected ? colors.primaryText : colors.foreground }}>
                {positionLabel(position)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {showPusherWarning ? (
        <Callout
          tone="warning"
          title={t("calibration.pusherOffsetWarning", { percent: PUSHER_NEUTRAL_OFFSET_WARNING_THRESHOLD_PERCENT })}
        />
      ) : null}

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText size="xs" tone="secondary">
            {activePosition
              ? t("calibration.editingPosition", { position: positionLabel(activePosition) })
              : t("calibration.noPositionSelected")}
          </AppText>
          <AppText weight="bold">
            {`${pulseToPercent(sliderValue)}%`}
          </AppText>
        </View>
        <Slider
          accessibilityLabel={t(`calibration.servos.${servo.name}`)}
          min={0}
          max={100}
          step={1}
          disabled={sliderDisabled}
          value={pulseToPercent(sliderValue)}
          onValueChange={(percent) => onSliderChange(module, servo.name, percentToPulse(percent))}
        />
      </View>

      {showRaw ? (
        <StepperRow
          value={sliderValue}
          min={SERVO_PULSE_MIN}
          max={SERVO_PULSE_MAX}
          bigStep={10}
          smallStep={1}
          disabled={sliderDisabled}
          valueLabel={String(sliderValue)}
          onChange={(value) => onSliderChange(module, servo.name, value)}
        />
      ) : null}
    </View>
  );
}
