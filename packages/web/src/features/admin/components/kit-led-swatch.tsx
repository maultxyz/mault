import { KIT_LED_SWATCH_MIN_OPACITY } from "@/lib/constants/kit-test";
import type { KitLedSwatchProps } from "@/lib/interfaces/kit-test";
import { cn } from "@/lib/utils";
import { LED_BRIGHTNESS_MAX } from "@magic-vault/shared";

export function KitLedSwatch({ led }: KitLedSwatchProps) {
  const opacity =
    KIT_LED_SWATCH_MIN_OPACITY +
    (1 - KIT_LED_SWATCH_MIN_OPACITY) * (led.brightness / LED_BRIGHTNESS_MAX);
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 rounded-full border",
        led.on ? "border-transparent" : "border-input",
      )}
      style={
        led.on
          ? { backgroundColor: `hsl(${led.hue} 100% 50% / ${opacity})` }
          : undefined
      }
    />
  );
}
