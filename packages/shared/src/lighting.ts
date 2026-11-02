import {
  DEFAULT_LIGHT_MODE,
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MAIN_LED_MASK,
  LIGHT_MODES,
  VALUE_CELEBRATION_DURATION_MIN_MS,
  VALUE_CELEBRATION_DURATION_MAX_MS,
} from "./constants/lighting.constant";
import type { LightMode, LightSettings } from "./interfaces/lighting.interface";
import type { ValueCelebrationSettings } from "./interfaces/lighting.interface";
import type { PriceSource } from "./interfaces/price-source.interface";

export function isValueCelebrationDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= VALUE_CELEBRATION_DURATION_MIN_MS && value <= VALUE_CELEBRATION_DURATION_MAX_MS;
}

export function toValueCelebrationCommand(durationMs: number) {
  if (!isValueCelebrationDuration(durationMs)) throw new Error("Invalid celebration duration");
  return { setLight: { mode: "value", durationMs } };
}

export function confirmedValueCelebrationDuration(line: string, expectedDurationMs: number): number | null {
  const response: unknown = JSON.parse(line);
  if (!response || typeof response !== "object" ||
    !("status" in response) || response.status !== "ok" ||
    !("lightAlert" in response)) {
    throw new Error("Invalid celebration acknowledgement");
  }
  if (response.lightAlert === "jam" || response.lightAlert === "empty") return null;
  if (response.lightAlert !== "value" || !("durationMs" in response) ||
    !isValueCelebrationDuration(response.durationMs) || response.durationMs !== expectedDurationMs) {
    throw new Error("Celebration duration not confirmed; update sorter firmware");
  }
  return response.durationMs;
}

export function qualifiesForValueCelebration(
  settings: ValueCelebrationSettings,
  source: PriceSource,
  price: number | null,
): boolean {
  return settings.valueCelebrationEnabled &&
    settings.valueCelebrationPriceSource === source &&
    Number.isFinite(settings.valueCelebrationThreshold) &&
    settings.valueCelebrationThreshold >= 0 &&
    price !== null && Number.isFinite(price) && price >= 0 &&
    price >= settings.valueCelebrationThreshold;
}

export function isLightMode(value: unknown): value is LightMode {
  return LIGHT_MODES.includes(value as LightMode);
}

export function toLightMode(value: unknown): LightMode {
  return isLightMode(value) ? value : DEFAULT_LIGHT_MODE;
}

export function isLightColor(value: unknown): value is string {
  return typeof value === "string" && LIGHT_COLOR_PATTERN.test(value);
}

export function isLightBrightness(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= LIGHT_BRIGHTNESS_MAX
  );
}

export function toSetLightCommand(
  settings: LightSettings,
  options?: { clearAlert?: boolean },
) {
  const hex = settings.lightColor.slice(1);
  const color =
    settings.lightMode === "custom"
      ? {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        }
      : {};
  return {
    setLight: {
      mode: settings.lightMode,
      brightness: settings.lightBrightness,
      leds: LIGHT_MAIN_LED_MASK,
      ...color,
    },
    ...(options?.clearAlert ? { clearAlert: true } : {}),
  };
}
