import { DEFAULT_MATCH_THRESHOLD_PERCENT } from "@magic-vault/shared";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateScanId(): string {
  return crypto.randomUUID();
}

// A raw `100 - distance * 100` reads misleadingly low once the acceptance
// threshold itself sits well above 0 distance (as it does for the current
// embedding model), and it also exposes exactly where that internal
// threshold sits. This instead reports how far into the passing range a
// match is, as its own self-contained 0-100 score - but anchors 100% at a
// realistic "excellent" distance rather than the theoretical (and in
// practice unreachable, for the current embedding model) distance of 0.
// Real match distances for this model cluster well above 0 even for a
// clearly-correct card, so scaling all the way from 0 crushed every real
// match into a tiny sliver near the bottom of the range. EXCELLENT_ANCHOR_
// FRACTION (80% of the way from threshold to 0) is a starting guess, not
// measured - revisit once more real scan data is available.
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
