import { ledPreviewColor } from "@/features/admin/lib/kit-led-states";
import { KIT_LED_SWATCH_MIN_OPACITY } from "@/lib/constants/kit-test";
import type { KitLedSwatchProps } from "@/lib/interfaces/kit-test";
import { LED_LEVEL_MAX } from "@magic-vault/shared";

export function KitLedSwatch({ led }: KitLedSwatchProps) {
  const opacity =
    KIT_LED_SWATCH_MIN_OPACITY +
    (1 - KIT_LED_SWATCH_MIN_OPACITY) * (led.brightness / LED_LEVEL_MAX);
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full border border-input"
      style={
        led.on ? { backgroundColor: ledPreviewColor(led, opacity) } : undefined
      }
    />
  );
}
