import {
  DEFAULT_LIGHT_MODE,
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MODES,
} from "./constants/lighting.constant";
import type { LightMode, LightSettings } from "./interfaces/lighting.interface";

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
      ...color,
    },
    ...(options?.clearAlert ? { clearAlert: true } : {}),
  };
}
