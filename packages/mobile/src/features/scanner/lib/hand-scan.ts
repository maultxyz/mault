import {
  HAND_SCAN_MAX_CORNER_SHIFT_RATIO,
  HAND_SCAN_REARM_SHIFT_RATIO,
  HAND_SCAN_REMOVAL_TICKS,
  HAND_SCAN_STABLE_TICKS,
  maxCornerShift,
  type CardContour,
} from "@magic-vault/shared";
import type { HandScanTracker, LiveCorners } from "@/lib/interfaces/scanner";

export function createHandScanTracker(): HandScanTracker {
  let armed = true;
  let stableTicks = 0;
  let absentTicks = 0;
  let last: CardContour | null = null;
  let captured: CardContour | null = null;

  return {
    update(corners: LiveCorners | null, canCapture: boolean): boolean {
      if (!corners) {
        stableTicks = 0;
        last = null;
        absentTicks++;
        if (absentTicks >= HAND_SCAN_REMOVAL_TICKS) armed = true;
        return false;
      }
      absentTicks = 0;
      const frameSize = Math.max(corners.frameWidth, corners.frameHeight);
      const previous = last;
      last = corners.contour;
      if (
        !armed &&
        canCapture &&
        (!captured || maxCornerShift(captured, corners.contour) > frameSize * HAND_SCAN_REARM_SHIFT_RATIO)
      ) {
        armed = true;
      }
      if (!armed || !canCapture) {
        stableTicks = 0;
        return false;
      }
      const isStill =
        previous !== null && maxCornerShift(previous, corners.contour) <= frameSize * HAND_SCAN_MAX_CORNER_SHIFT_RATIO;
      stableTicks = isStill ? stableTicks + 1 : 0;
      if (stableTicks < HAND_SCAN_STABLE_TICKS) return false;
      stableTicks = 0;
      armed = false;
      captured = corners.contour;
      return true;
    },
  };
}
