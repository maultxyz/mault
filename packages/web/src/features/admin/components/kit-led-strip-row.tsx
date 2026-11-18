import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { KitLedSwatch } from "@/features/admin/components/kit-led-swatch";
import type { KitLedStripRowProps } from "@/lib/interfaces/kit-test";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function KitLedStripRow({
  strip,
  leds,
  selection,
  disabled,
  onSelect,
  onStripToggle,
}: KitLedStripRowProps) {
  const { t } = useTranslation("admin");
  const headingId = useId();
  const switchId = useId();
  const allOn = leds.every((led) => led.on);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          {t("kitTest.leds.strip", { strip })}
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={switchId} className="text-xs">
            {t("kitTest.leds.stripOn", { strip })}
          </Label>
          <Switch
            id={switchId}
            checked={allOn}
            disabled={disabled}
            onCheckedChange={(checked) => onStripToggle(strip, checked)}
          />
        </div>
      </div>
      <div
        role="group"
        aria-labelledby={headingId}
        className="grid grid-cols-8 gap-1.5"
      >
        {leds.map((led, index) => {
          const number = index + 1;
          const isSelected =
            selection.strip === strip && selection.led === number;
          return (
            <Button
              key={number}
              variant={isSelected ? "outline-selected" : "outline"}
              aria-pressed={isSelected}
              aria-label={t("kitTest.leds.ledLabel", {
                led: number,
                state: t(led.on ? "kitTest.leds.on" : "kitTest.leds.off"),
              })}
              className="px-0"
              disabled={disabled}
              onClick={() => onSelect({ strip, led: number })}
            >
              <KitLedSwatch led={led} />
              {number}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
