import { Callout } from "@/components/callout";
import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CameraLightTestProps } from "@/lib/interfaces/calibration";
import { LIGHT_BRIGHTNESS_MAX } from "@magic-vault/shared";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function CameraLightTest({ test }: CameraLightTestProps) {
  const { t } = useTranslation("calibration");
  const mode = useWatch({ control: test.control, name: "lightMode" });

  return (
    <div className="flex flex-col gap-3 pt-2 border-t">
      <h3 className="text-sm font-semibold">{t("cameraLightTest.heading")}</h3>
      <p className="text-xs text-foreground/70">{t("cameraLightTest.description")}</p>
      {!test.canApply && <Callout variant="info">{t("cameraLightTest.unavailable")}</Callout>}
      <form onSubmit={test.apply} className="flex flex-col gap-3">
        <fieldset disabled={test.busy || !test.canApply} className="flex flex-col gap-3">
          <Controller control={test.control} name="lightMode" render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camera-light-mode">{t("lights.modeLabel")}</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={test.busy || !test.canApply}>
                <SelectTrigger id="camera-light-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{t("lights.modes.off.label")}</SelectItem>
                  <SelectItem value="white">{t("lights.modes.white.label")}</SelectItem>
                  <SelectItem value="custom">{t("lights.modes.custom.label")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )} />
          {mode === "custom" && (
            <>
              <Controller control={test.control} name="lightColor" render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="camera-light-color">{t("lights.colorLabel")}</Label>
                  <Input id="camera-light-color" type="color" className="h-9 w-14 cursor-pointer p-1" {...field} />
                </div>
              )} />
              {test.rgbwSupported && (
                <Controller control={test.control} name="lightWhite" render={({ field }) => (
                  <SliderField label={t("lights.whiteChannelLabel")} valueLabel={`${field.value}/255`}
                    min={0} max={LIGHT_BRIGHTNESS_MAX} value={field.value}
                    disabled={test.busy || !test.canApply} onValueChange={field.onChange} />
                )} />
              )}
            </>
          )}
          <Controller control={test.control} name="lightBrightness" render={({ field }) => (
            <SliderField label={t("lights.brightnessLabel")} valueLabel={`${field.value}/255`}
              min={0} max={LIGHT_BRIGHTNESS_MAX} value={field.value}
              disabled={test.busy || !test.canApply} onValueChange={field.onChange} />
          )} />
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={test.busy || !test.canApply}>{t("cameraLightTest.preview")}</Button>
          {test.active && (
            <Button type="button" variant="outline" disabled={test.busy} onClick={() => void test.stop()}>
              {t("cameraLightTest.restore")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
