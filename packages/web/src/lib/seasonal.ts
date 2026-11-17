import {
  HALLOWEEN_MONTH_INDEX,
  SPIDER_WEB_RADIAL_ANGLES,
  SPIDER_WEB_RING_RADII,
  SPIDER_WEB_RING_SAG,
  SPIDER_WEB_VIEWBOX,
} from "@/lib/constants/seasonal";

export function isHalloweenSeason(date: Date = new Date()): boolean {
  return date.getMonth() === HALLOWEEN_MONTH_INDEX;
}

function polar(radius: number, degrees: number): string {
  const radians = (degrees * Math.PI) / 180;
  return `${(radius * Math.cos(radians)).toFixed(2)} ${(radius * Math.sin(radians)).toFixed(2)}`;
}

function buildSpiderWebPath(): string {
  const radials = SPIDER_WEB_RADIAL_ANGLES.map(
    (angle) => `M0 0L${polar(SPIDER_WEB_VIEWBOX, angle)}`,
  );
  const rings = SPIDER_WEB_RING_RADII.map((radius) => {
    const segments = SPIDER_WEB_RADIAL_ANGLES.slice(1).map((angle, index) => {
      const previous = SPIDER_WEB_RADIAL_ANGLES[index];
      const control = polar(radius * SPIDER_WEB_RING_SAG, (previous + angle) / 2);
      return `Q${control} ${polar(radius, angle)}`;
    });
    return `M${polar(radius, SPIDER_WEB_RADIAL_ANGLES[0])}${segments.join("")}`;
  });
  return [...radials, ...rings].join("");
}

export const SPIDER_WEB_PATH = buildSpiderWebPath();
