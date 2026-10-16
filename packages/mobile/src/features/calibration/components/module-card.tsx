import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import { DEFAULT_CALIBRATION, FIRMWARE_FEATURE_MIN_VERSIONS, isFirmwareFeatureSupported } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SliderField } from "@/components/ui/slider-field";
import { Surface } from "@/components/ui/surface";
import { ServoControl } from "@/features/calibration/components/servo-control";
import { useTheme } from "@/hooks/use-theme";
import {
  DEFAULT_SLIDER_PULSE,
  MODULE_DELAY_FIELDS,
  MODULE_DELAY_FIRMWARE_FEATURES,
  MODULE_DELAY_SLIDER_MAX,
  PUSH_TEST_DIRECTIONS,
  SERVOS,
  sliderMax,
} from "@/lib/constants/calibration";
import { SPACING } from "@/lib/constants/theme";
import type { ModuleCardProps, SliderKey } from "@/lib/interfaces/calibration";

export function ModuleCard({ module, state, firmwareVersion }: ModuleCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [showRaw, setShowRaw] = useState(false);
  const saved = state.configs.find((c) => c.moduleNumber === module)?.calibration;
  const calibration = saved ? { ...saved, ...state.pendingCalibration[module] } : undefined;

  return (
    <Surface style={{ gap: SPACING.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText heading weight="semibold">
          {t("calibration.moduleLabel", { module })}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <AppText size="xs" weight="medium">
            {t("calibration.rawPulseToggleLabel")}
          </AppText>
          <Switch
            accessibilityLabel={t("calibration.rawPulseToggleLabel")}
            value={showRaw}
            onValueChange={setShowRaw}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>
      </View>

      {SERVOS.map((servo) => {
        const key: SliderKey = `${module}:${servo.name}`;
        return (
          <ServoControl
            key={servo.name}
            module={module}
            servo={servo}
            sliderValue={state.sliderValues[key] ?? DEFAULT_SLIDER_PULSE}
            activePosition={state.active[key]}
            calibration={calibration}
            canCalibrate={state.canCalibrate}
            isTesting={state.testingServos[key] ?? false}
            showRaw={showRaw}
            onControl={state.handleControl}
            onSliderChange={state.handleSliderChange}
            onTest={state.handleServoTest}
          />
        );
      })}

      {MODULE_DELAY_FIELDS.map((field) => {
        const value = state.moduleDelayValues[module]?.[field] ?? DEFAULT_CALIBRATION[field];
        const feature = MODULE_DELAY_FIRMWARE_FEATURES[field];
        const supported = !feature || isFirmwareFeatureSupported(firmwareVersion, feature);
        return (
          <SliderField
            key={field}
            label={t(`calibration.delays.${field}.label`)}
            description={
              supported
                ? t(`calibration.delays.${field}.description`)
                : t("calibration.firmwareRequired", { version: feature ? FIRMWARE_FEATURE_MIN_VERSIONS[feature] : "" })
            }
            valueLabel={t("calibration.msValue", { value })}
            accessibilityLabel={t(`calibration.delays.${field}.label`)}
            min={0}
            max={sliderMax(value, MODULE_DELAY_SLIDER_MAX[field])}
            step={10}
            disabled={!state.canCalibrate || !supported}
            value={value}
            onValueChange={(next) => state.handleModuleDelayChange(module, field, next)}
          />
        );
      })}

      <View style={{ gap: SPACING.sm }}>
        <View>
          <AppText size="xs" weight="medium">
            {t("calibration.pushTestLabel")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("calibration.pushTestTooltip")}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {PUSH_TEST_DIRECTIONS.map((direction) => (
            <Button
              key={direction}
              style={{ flex: 1 }}
              variant="secondary"
              icon="play"
              label={t(`calibration.positions.${direction}`).toUpperCase()}
              loading={state.pushTestingModule === module}
              disabled={!state.isReady || state.pushTestingModule !== null}
              onPress={() => void state.handlePushTest(module, direction)}
            />
          ))}
        </View>
      </View>
    </Surface>
  );
}
