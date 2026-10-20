import { Callout } from "@/components/callout";
import { FirmwareFeatureGate } from "@/components/firmware-feature-gate";
import { SettingsSection } from "@/components/settings-section";
import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { LightingPanelProps } from "@/lib/interfaces/calibration";
import {
  isLightMode,
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_MODES,
} from "@magic-vault/shared";
import { IconConfetti, IconInfoCircle, IconX } from "@tabler/icons-react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function LightingPanel({
  control,
  isLoaded,
  canControl,
  onPreview,
  onTestCelebration,
  onClearAlert,
}: LightingPanelProps) {
  const { t } = useTranslation("calibration");
  const mode = useWatch({ control, name: "lightMode" });

  return (
    <FirmwareFeatureGate feature="lighting" className="flex flex-col gap-6">
      {!canControl && (
        <Callout variant="info" icon={IconInfoCircle}>
          {t("lights.previewUnavailable")}
        </Callout>
      )}

      <SettingsSection
        heading={t("lights.strip.heading")}
        description={t("lights.strip.description")}
      >
        {isLoaded ? (
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="lightMode"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="light-mode">{t("lights.modeLabel")}</Label>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (!isLightMode(value)) return;
                      field.onChange(value);
                      onPreview();
                    }}
                  >
                    <SelectTrigger id="light-mode" className="w-full sm:w-64">
                      <SelectValue>{t(`lights.modes.${field.value}.label`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LIGHT_MODES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`lights.modes.${option}.label`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-foreground/70">
                    {t(`lights.modes.${field.value}.description`)}
                  </p>
                </div>
              )}
            />

            {mode === "custom" && (
              <Controller
                control={control}
                name="lightColor"
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="light-color">{t("lights.colorLabel")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="light-color"
                        type="color"
                        className="h-9 w-14 cursor-pointer p-1"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value.toLowerCase());
                          onPreview();
                        }}
                      />
                      <span className="text-sm font-medium tabular-nums uppercase">
                        {field.value}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}

            <Controller
              control={control}
              name="lightBrightness"
              render={({ field }) => (
                <SliderField
                  label={t("lights.brightnessLabel")}
                  valueLabel={t("lights.brightnessValue", {
                    percent: Math.round(
                      (field.value / LIGHT_BRIGHTNESS_MAX) * 100,
                    ),
                  })}
                  min={0}
                  max={LIGHT_BRIGHTNESS_MAX}
                  value={field.value}
                  disabled={mode === "off"}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onPreview();
                  }}
                />
              )}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        heading={t("lights.alerts.heading")}
        description={t("lights.alerts.description")}
      >
        <ul className="flex flex-col gap-1 text-sm">
          <li>{t("lights.alerts.jam")}</li>
          <li>{t("lights.alerts.empty")}</li>
          <li>{t("lights.alerts.value")}</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!canControl}
            onClick={onTestCelebration}
          >
            <IconConfetti />
            {t("lights.alerts.testCelebration")}
          </Button>
          <Button variant="outline" disabled={!canControl} onClick={onClearAlert}>
            <IconX />
            {t("lights.alerts.clear")}
          </Button>
        </div>
      </SettingsSection>
    </FirmwareFeatureGate>
  );
}
