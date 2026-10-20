export const LIGHT_MODES = ["off", "white", "custom", "foil"] as const;
export const DEFAULT_LIGHT_MODE = "off";
export const DEFAULT_LIGHT_COLOR = "#ffffff";
export const DEFAULT_LIGHT_BRIGHTNESS = 160;
export const LIGHT_BRIGHTNESS_MAX = 255;
export const LIGHT_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
export const LIGHT_VALUE_COMMAND = { setLight: "value" };
