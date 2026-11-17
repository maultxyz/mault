import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useKitLeds } from "@/features/admin/api/use-kit-leds";
import { KitLedStripRow } from "@/features/admin/components/kit-led-strip-row";
import {
  KIT_LED_DEFAULT_SELECTION,
  KIT_LED_HUE_GRADIENT,
} from "@/lib/constants/kit-test";
import type {
  KitLedBenchProps,
  KitLedSelection,
} from "@/lib/interfaces/kit-test";
import {
  FIRMWARE_FEATURE_MIN_VERSIONS,
  LED_BRIGHTNESS_MAX,
  LED_HUE_MAX,
} from "@magic-vault/shared";
import { IconRefresh } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function KitLedBench({ disabled }: KitLedBenchProps) {
  const { t } = useTranslation("admin");
  const {
    ledStates,
    isSupported,
    previewLeds,
    updateLeds,
    loadLedStatesFromBoard,
  } = useKitLeds();
  const [selection, setSelection] = useState<KitLedSelection>(
    KIT_LED_DEFAULT_SELECTION,
  );
  const ledSwitchId = useId();
  const locked = disabled || !isSupported;
  const selected = ledStates[selection.strip - 1][selection.led - 1];

  return (
    <SettingsSection
      heading={t("kitTest.leds.heading")}
      description={t("kitTest.leds.description")}
      action={
        <Button
          variant="outline"
          disabled={locked}
          onClick={() => void loadLedStatesFromBoard()}
        >
          <IconRefresh />
          {t("kitTest.leds.reload")}
        </Button>
      }
    >
      {!disabled && !isSupported && (
        <Callout variant="warning">
          {t("kitTest.leds.needsFirmware", {
            version: FIRMWARE_FEATURE_MIN_VERSIONS.ledStrips,
          })}
        </Callout>
      )}

      {ledStates.map((leds, index) => (
        <KitLedStripRow
          key={index + 1}
          strip={index + 1}
          leds={leds}
          selection={selection}
          disabled={locked}
          onSelect={setSelection}
          onStripToggle={(strip, on) => void updateLeds({ strip, on })}
        />
      ))}

      <div className="flex flex-col gap-3 rounded-lg bg-foreground/6 p-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            {t("kitTest.leds.selected", {
              strip: selection.strip,
              led: selection.led,
            })}
          </h3>
          <div className="flex items-center gap-2">
            <Label htmlFor={ledSwitchId} className="text-xs">
              {t("kitTest.leds.on")}
            </Label>
            <Switch
              id={ledSwitchId}
              checked={selected.on}
              disabled={locked}
              onCheckedChange={(on) => void updateLeds({ ...selection, on })}
            />
          </div>
        </div>

        <SliderField
          label={t("kitTest.leds.hue")}
          valueLabel={t("kitTest.leds.hueValue", { hue: selected.hue })}
          min={0}
          max={LED_HUE_MAX}
          value={selected.hue}
          disabled={locked}
          onValueChange={(hue) => previewLeds({ ...selection, hue })}
          onValueCommitted={(hue) => void updateLeds({ ...selection, hue })}
        >
          <div
            aria-hidden
            className="h-1.5 rounded-full"
            style={{ background: KIT_LED_HUE_GRADIENT }}
          />
        </SliderField>

        <SliderField
          label={t("kitTest.leds.brightness")}
          valueLabel={t("kitTest.leds.brightnessValue", {
            percent: Math.round(
              (selected.brightness / LED_BRIGHTNESS_MAX) * 100,
            ),
          })}
          min={0}
          max={LED_BRIGHTNESS_MAX}
          value={selected.brightness}
          disabled={locked}
          onValueChange={(brightness) =>
            previewLeds({ ...selection, brightness })
          }
          onValueCommitted={(brightness) =>
            void updateLeds({ ...selection, brightness })
          }
        />

        <div className="flex justify-end">
          <Button
            variant="outline"
            disabled={locked}
            onClick={() =>
              void updateLeds({
                strip: selection.strip,
                on: selected.on,
                hue: selected.hue,
                brightness: selected.brightness,
              })
            }
          >
            {t("kitTest.leds.applyToStrip", { strip: selection.strip })}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
