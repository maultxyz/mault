import {
  CHRISTMAS_GARLAND_CURVE,
  CHRISTMAS_GARLAND_NEEDLE_LENGTH,
  CHRISTMAS_GARLAND_NEEDLE_STEPS,
  SEASONAL_THEME_BY_MONTH_INDEX,
  SPIDER_WEB_RADIAL_ANGLES,
  SPIDER_WEB_RING_RADII,
  SPIDER_WEB_RING_SAG,
  SPIDER_WEB_VIEWBOX,
} from "@/lib/constants/seasonal";
import type { GarlandNeedlePaths, SeasonalTheme, SvgPoint } from "@/lib/interfaces/seasonal";

export function seasonalThemeOf(date: Date = new Date()): SeasonalTheme | null {
  return SEASONAL_THEME_BY_MONTH_INDEX[date.getMonth()] ?? null;
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

export function garlandPointAt(curveT: number): SvgPoint {
  const { start, control, end } = CHRISTMAS_GARLAND_CURVE;
  const remaining = 1 - curveT;
  return {
    x: remaining * remaining * start.x + 2 * remaining * curveT * control.x + curveT * curveT * end.x,
    y: remaining * remaining * start.y + 2 * remaining * curveT * control.y + curveT * curveT * end.y,
  };
}

function formatPoint(point: SvgPoint): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

function needleTip(origin: SvgPoint, degrees: number, length: number): SvgPoint {
  const radians = (degrees * Math.PI) / 180;
  return { x: origin.x + length * Math.cos(radians), y: origin.y + length * Math.sin(radians) };
}

function buildGarlandNeedlePaths(): GarlandNeedlePaths {
  const darkNeedles: string[] = [];
  const lightNeedles: string[] = [];
  for (let step = 0; step <= CHRISTMAS_GARLAND_NEEDLE_STEPS; step += 1) {
    const curveT = step / CHRISTMAS_GARLAND_NEEDLE_STEPS;
    const origin = garlandPointAt(curveT);
    const ahead = garlandPointAt(Math.min(1, curveT + 0.01));
    const behind = garlandPointAt(Math.max(0, curveT - 0.01));
    const heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
    const lengthJitter = CHRISTMAS_GARLAND_NEEDLE_LENGTH * (0.55 + ((step * 37) % 10) / 18);
    [-70, -40, -15, 20, 50, 80, 110, 140, 165, -110, -140, -165].forEach((offset, needleIndex) => {
      const needleLength = lengthJitter * (0.7 + ((needleIndex * 7 + step * 5) % 6) / 10);
      const tip = needleTip(origin, heading + offset + ((step * 13 + needleIndex * 29) % 23) - 11, needleLength);
      const segment = `M${formatPoint(origin)}L${formatPoint(tip)}`;
      (needleIndex % 2 === step % 2 ? darkNeedles : lightNeedles).push(segment);
    });
  }
  return { dark: darkNeedles.join(""), light: lightNeedles.join("") };
}

export const GARLAND_NEEDLE_PATHS = buildGarlandNeedlePaths();

export const GARLAND_BRANCH_PATH = (() => {
  const { start, control, end } = CHRISTMAS_GARLAND_CURVE;
  return `M${formatPoint(start)}Q${formatPoint(control)} ${formatPoint(end)}`;
})();

function buildSnowflakePath(): string {
  const arms: string[] = [];
  for (let arm = 0; arm < 6; arm += 1) {
    const heading = arm * 60;
    const tip = needleTip({ x: 0, y: 0 }, heading, 1);
    const branchBase = needleTip({ x: 0, y: 0 }, heading, 0.55);
    arms.push(`M0 0L${formatPoint(tip)}`);
    arms.push(`M${formatPoint(branchBase)}L${formatPoint(needleTip(branchBase, heading + 45, 0.3))}`);
    arms.push(`M${formatPoint(branchBase)}L${formatPoint(needleTip(branchBase, heading - 45, 0.3))}`);
  }
  return arms.join("");
}

export const SNOWFLAKE_UNIT_PATH = buildSnowflakePath();
