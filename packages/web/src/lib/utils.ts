import { DEFAULT_MATCH_THRESHOLD_PERCENT } from "@magic-vault/shared";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateScanId(): string {
  return crypto.randomUUID();
}

const EXCELLENT_ANCHOR_FRACTION = 0.8;

export function matchPercentFromDistance(
  distance: number,
  matchThresholdPercent: number = DEFAULT_MATCH_THRESHOLD_PERCENT,
): number {
  const distanceThreshold = 1 - matchThresholdPercent / 100;
  if (distanceThreshold <= 0) return 0;
  const excellentAnchor = distanceThreshold * EXCELLENT_ANCHOR_FRACTION;
  const percent =
    (100 * (distanceThreshold - distance)) / (distanceThreshold - excellentAnchor);
  return Math.max(0, Math.min(100, percent));
}
