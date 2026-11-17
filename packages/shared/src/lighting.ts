import {
  DEFAULT_LIGHT_MODE,
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MAIN_LED_MASK,
  LEGACY_LIGHT_MAIN_LED_MASK,
  DEFAULT_LIGHT_LED_COUNT,
  LIGHT_MODES,
  VALUE_CELEBRATION_DURATION_MIN_MS,
  VALUE_CELEBRATION_DURATION_MAX_MS,
  LIGHT_TIMER_MIN_SECONDS,
  LIGHT_TIMER_MAX_SECONDS,
} from "./constants/lighting.constant";
import type { LightLedCount, LightMode, LightSettings, LightWarningSettings } from "./interfaces/lighting.interface";
import type { ValueCelebrationSettings } from "./interfaces/lighting.interface";
import type { PriceSource } from "./interfaces/price-source.interface";

export function isValueCelebrationDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= VALUE_CELEBRATION_DURATION_MIN_MS && value <= VALUE_CELEBRATION_DURATION_MAX_MS;
}

export function isLightTimerSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= LIGHT_TIMER_MIN_SECONDS && value <= LIGHT_TIMER_MAX_SECONDS;
}

export function assertLightWarningReply(line: string, settings: LightWarningSettings) {
  const response: unknown = JSON.parse(line);
  if (!response || typeof response !== "object" || !("status" in response) || response.status !== "ok" ||
    !("warnings" in response) || !response.warnings || typeof response.warnings !== "object" ||
    !("enabled" in response.warnings) || response.warnings.enabled !== settings.lightWarningsEnabled ||
    !("emptySeconds" in response.warnings) || response.warnings.emptySeconds !== settings.lightEmptyWarningSeconds ||
    !("blockedSeconds" in response.warnings) || response.warnings.blockedSeconds !== settings.lightBlockedWarningSeconds ||
    !("normalSeconds" in response.warnings) || response.warnings.normalSeconds !== settings.lightNormalSeconds) {
    throw new Error("Lighting warning settings not confirmed; update sorter firmware");
  }
}

export function toValueCelebrationCommand(durationMs: number, ledCount?: LightLedCount) {
  if (!isValueCelebrationDuration(durationMs)) throw new Error("Invalid celebration duration");
  if (ledCount !== undefined && !isLightLedCount(ledCount)) throw new Error("Invalid LED count");
  return { setLight: { mode: "value", durationMs, ...(ledCount !== undefined && { ledCount }) } };
}

export function confirmedValueCelebrationDuration(line: string, expectedDurationMs: number, expectedLedCount?: LightLedCount): number | null {
  const response: unknown = JSON.parse(line);
  if (!response || typeof response !== "object" ||
    !("status" in response) || response.status !== "ok" ||
    !("lightAlert" in response)) {
    throw new Error("Invalid celebration acknowledgement");
  }
  if (response.lightAlert === "jam" || response.lightAlert === "empty" ||
    ("warningActive" in response && response.warningActive === true)) return null;
  if (response.lightAlert !== "value" || !("durationMs" in response) ||
    !isValueCelebrationDuration(response.durationMs) || response.durationMs !== expectedDurationMs ||
    (expectedLedCount !== undefined && (!("ledCount" in response) || response.ledCount !== expectedLedCount))) {
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

export function isLightLedCount(value: unknown): value is LightLedCount {
  return value === 8 || value === 16;
}

export function assertLightLedCountReply(line: string, ledCount: LightLedCount) {
  const response: unknown = JSON.parse(line);
  if (!response || typeof response !== "object" || !("status" in response) || response.status !== "ok" ||
    !("ledCount" in response) || response.ledCount !== ledCount) {
    throw new Error("LED count not confirmed; update sorter firmware");
  }
}

export function mainLightLedMask(count: LightLedCount): number {
  return count === 8 ? 0x7E : LIGHT_MAIN_LED_MASK;
}

export function toSetLightCommand(
  settings: LightSettings & Partial<LightWarningSettings>,
  options?: { clearAlert?: boolean; warningsSupported?: boolean; rgbwSupported?: boolean; configurableLightingSupported?: boolean },
) {
  if (options?.configurableLightingSupported && settings.lightLedCount !== undefined && !isLightLedCount(settings.lightLedCount)) {
    throw new Error("Invalid LED count");
  }
  let warnings: { enabled: boolean; emptySeconds: number; blockedSeconds: number; normalSeconds: number } | undefined;
  if (options?.warningsSupported && "lightWarningsEnabled" in settings) {
    if (typeof settings.lightWarningsEnabled !== "boolean" ||
      !isLightTimerSeconds(settings.lightEmptyWarningSeconds) ||
      !isLightTimerSeconds(settings.lightBlockedWarningSeconds) ||
      !isLightTimerSeconds(settings.lightNormalSeconds)) throw new Error("Invalid lighting warning settings");
    warnings = {
      enabled: settings.lightWarningsEnabled,
      emptySeconds: settings.lightEmptyWarningSeconds,
      blockedSeconds: settings.lightBlockedWarningSeconds,
      normalSeconds: settings.lightNormalSeconds,
    };
  }
  const hex = settings.lightColor.slice(1);
  const color =
    settings.lightMode === "custom"
      ? {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          ...(options?.rgbwSupported && { w: settings.lightWhite ?? 0 }),
        }
      : {};
  return {
    setLight: {
      mode: settings.lightMode,
      brightness: settings.lightBrightness,
      leds: options?.configurableLightingSupported
        ? mainLightLedMask(settings.lightLedCount ?? DEFAULT_LIGHT_LED_COUNT)
        : LEGACY_LIGHT_MAIN_LED_MASK,
      ...(options?.configurableLightingSupported && { ledCount: settings.lightLedCount ?? DEFAULT_LIGHT_LED_COUNT }),
      ...color,
      ...(warnings && { warnings }),
    },
    ...(options?.clearAlert ? { clearAlert: true } : {}),
  };
}
