import { DARK_PRIMARY_TEXT_MIN_LIGHTNESS, PRIMARY_MUTED_ALPHA } from "@/lib/constants/theme";
import type { ThemeColors } from "@/lib/interfaces/theme";
import type { ThemeColorOption } from "@/lib/interfaces/settings";

function hexToLinear(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 0xff, value & 0xff].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

function linearToHex([r, g, b]: [number, number, number]): string {
  const toChannel = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`;
}

function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function withMinLightness(hex: string, minLightness: number): string {
  const [L, a, b] = toOklab(hexToLinear(hex));
  return L >= minLightness ? hex : linearToHex(fromOklab([minLightness, a, b]));
}

function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 0xff}, ${value & 0xff}, ${alpha})`;
}

export function applyPrimaryColor(base: ThemeColors, color: ThemeColorOption | null, dark: boolean): ThemeColors {
  if (!color) return base;
  return {
    ...base,
    primary: color.value,
    primaryForeground: color.fg,
    primaryText: dark ? withMinLightness(color.value, DARK_PRIMARY_TEXT_MIN_LIGHTNESS) : color.value,
    primaryMuted: withAlpha(color.value, dark ? PRIMARY_MUTED_ALPHA.dark : PRIMARY_MUTED_ALPHA.light),
  };
}
