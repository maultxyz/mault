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
import { Switch } from "@/components/ui/switch";
import { usePriceSource } from "@/hooks/use-price-source";
import type { LightingPanelProps } from "@/lib/interfaces/calibration";
import {
  isLightMode,
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_MODES,
  VALUE_CELEBRATION_DURATION_MIN_MS,
  VALUE_CELEBRATION_DURATION_MAX_MS,
  LIGHT_TIMER_MIN_SECONDS,
  LIGHT_TIMER_MAX_SECONDS,
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
  const celebrationEnabled = useWatch({ control, name: "valueCelebrationEnabled" });
  const warningsEnabled = useWatch({ control, name: "lightWarningsEnabled" });
  const { source, format } = usePriceSource();

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
              name="lightLedCount"
              render={({ field }) => (
                <FirmwareFeatureGate feature="configurableLighting">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="light-led-count">{t("lights.ledCountLabel")}</Label>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => {
                        if (value !== "8" && value !== "16") return;
                        field.onChange(value === "8" ? 8 : 16);
                        onPreview();
                      }}
                    >
                      <SelectTrigger id="light-led-count" className="w-full sm:w-64">
                        <SelectValue>{t("lights.ledCountValue", { count: field.value })}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">{t("lights.ledCountValue", { count: 8 })}</SelectItem>
                        <SelectItem value="16">{t("lights.ledCountValue", { count: 16 })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-foreground/70">{t("lights.ledCountHelp")}</p>
                  </div>
                </FirmwareFeatureGate>
              )}
            />
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
              <>
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
                <FirmwareFeatureGate feature="rgbwLighting">
                  <Controller
                    control={control}
                    name="lightWhite"
                    render={({ field }) => (
                      <SliderField
                        label={t("lights.whiteChannelLabel")}
                        valueLabel={t("lights.whiteChannelValue", { value: field.value })}
                        min={0}
                        max={LIGHT_BRIGHTNESS_MAX}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          onPreview();
                        }}
                      />
                    )}
                  />
                </FirmwareFeatureGate>
              </>
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
        heading={t("lights.celebration.heading")}
        description={t("lights.celebration.description")}
      >
        {isLoaded ? (
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="valueCelebrationEnabled"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch id="value-celebration-enabled" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="value-celebration-enabled">{t("lights.celebration.enabled")}</Label>
                </div>
              )}
            />
            <Controller
              control={control}
              name="valueCelebrationThreshold"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="value-celebration-threshold">{t("lights.celebration.threshold", { currency: format(0) })}</Label>
                  <Input
                    id="value-celebration-threshold"
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!celebrationEnabled}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    aria-invalid={!!fieldState.error}
                    className="sm:w-64"
                  />
                  {fieldState.error && <p className="text-xs text-destructive">{t("lights.celebration.invalidThreshold")}</p>}
                </div>
              )}
            />
            <Controller
              control={control}
              name="valueCelebrationDurationMs"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="value-celebration-duration">{t("lights.celebration.duration")}</Label>
                  <Input
                    id="value-celebration-duration"
                    type="number"
                    min={VALUE_CELEBRATION_DURATION_MIN_MS / 1000}
                    max={VALUE_CELEBRATION_DURATION_MAX_MS / 1000}
                    step={0.1}
                    disabled={!celebrationEnabled}
                    value={Number.isNaN(field.value) ? "" : field.value / 1000}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    onChange={(event) => field.onChange(Math.round(event.target.valueAsNumber * 1000))}
                    aria-invalid={!!fieldState.error}
                    className="sm:w-64"
                  />
                  {fieldState.error && <p className="text-xs text-destructive">{t("lights.celebration.invalidDuration")}</p>}
                </div>
              )}
            />
            <p className="text-xs text-foreground/70">{t("lights.celebration.source", { source })}</p>
          </div>
        ) : <Skeleton className="h-20 w-full" />}
      </SettingsSection>

      <SettingsSection
        heading={t("lights.alerts.heading")}
        description={t("lights.alerts.description")}
      >
        <FirmwareFeatureGate feature="lightingWarnings">
          {isLoaded ? (
            <div className="flex flex-col gap-4">
              <Controller control={control} name="lightWarningsEnabled" render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch id="light-warnings-enabled" checked={field.value} onCheckedChange={(checked) => {
                    field.onChange(checked);
                    onPreview();
                  }} />
                  <Label htmlFor="light-warnings-enabled">{t("lights.alerts.enabled")}</Label>
                </div>
              )} />
              {(["lightEmptyWarningSeconds", "lightBlockedWarningSeconds", "lightNormalSeconds"] as const).map((name) => (
                <Controller key={name} control={control} name={name} render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={name}>{t(`lights.alerts.${name}`)}</Label>
                    <Input id={name} type="number" min={LIGHT_TIMER_MIN_SECONDS} max={LIGHT_TIMER_MAX_SECONDS} step={1}
                      disabled={!warningsEnabled} value={Number.isNaN(field.value) ? "" : field.value}
                      onBlur={field.onBlur} ref={field.ref} aria-invalid={!!fieldState.error}
                      onChange={(event) => { field.onChange(event.target.valueAsNumber); onPreview(); }} className="sm:w-64" />
                    {fieldState.error && <p className="text-xs text-destructive">{t("lights.alerts.invalidSeconds")}</p>}
                  </div>
                )} />
              ))}
            </div>
          ) : <Skeleton className="h-20 w-full" />}
        </FirmwareFeatureGate>
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
