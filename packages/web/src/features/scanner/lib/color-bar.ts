import {
  COLOR_BAR_HUE_RANGES,
  COLOR_BAR_MIN_BRIGHTNESS,
  COLOR_BAR_MIN_SATURATION,
  COLOR_BAR_MIN_SHARE,
} from "@/lib/constants/scanner";
import type { ColorBarRegion } from "@magic-vault/shared";

function hueOf(r: number, g: number, b: number): number | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max < COLOR_BAR_MIN_BRIGHTNESS || delta / max < COLOR_BAR_MIN_SATURATION)
    return null;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function colorForHue(hue: number): string | null {
  for (const [color, ranges] of Object.entries(COLOR_BAR_HUE_RANGES)) {
    if (ranges.some(([from, to]) => hue >= from && hue < to)) return color;
  }
  return null;
}

export function detectColorBar(
  canvas: HTMLCanvasElement,
  region: ColorBarRegion,
): string | null {
  const left = Math.round(region.x * canvas.width);
  const top = Math.round(region.y * canvas.height);
  const width = Math.max(1, Math.round(region.width * canvas.width));
  const height = Math.max(1, Math.round(region.height * canvas.height));
  const copy = document.createElement("canvas");
  copy.width = width;
  copy.height = height;
  const ctx = copy.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(canvas, left, top, width, height, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const votes: Record<string, number> = {};
  for (let i = 0; i < data.length; i += 4) {
    const hue = hueOf(data[i], data[i + 1], data[i + 2]);
    if (hue === null) continue;
    const color = colorForHue(hue);
    if (color) votes[color] = (votes[color] ?? 0) + 1;
  }

  const [best] = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (!best) return null;
  return best[1] / (width * height) >= COLOR_BAR_MIN_SHARE ? best[0] : null;
}
