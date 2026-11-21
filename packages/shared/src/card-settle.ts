import {
  CARD_SETTLE_MAX_CORNER_SHIFT_RATIO,
  CARD_SETTLE_STABLE_TICKS,
} from "./constants/scanner.constant";
import type { CardSettleTracker } from "./interfaces/scan-identify.interface";
import type { CardContour } from "./interfaces/scanner.interface";
import { maxCornerShift } from "./vision";

export function createCardSettleTracker(
  stableTicksNeeded = CARD_SETTLE_STABLE_TICKS,
  maxCornerShiftRatio = CARD_SETTLE_MAX_CORNER_SHIFT_RATIO,
): CardSettleTracker {
  let previous: CardContour | null = null;
  let stableTicks = 0;
  return {
    observe({ cardPresent, contour }, frameLongSidePx) {
      if (!cardPresent || !contour) {
        previous = null;
        stableTicks = 0;
        return false;
      }
      const isStill =
        previous !== null &&
        maxCornerShift(previous, contour) <=
          frameLongSidePx * maxCornerShiftRatio;
      previous = contour;
      stableTicks = isStill ? stableTicks + 1 : 0;
      return stableTicks >= stableTicksNeeded;
    },
    settlesOnNextStillFrame() {
      return previous !== null && stableTicks >= stableTicksNeeded - 1;
    },
    reset() {
      previous = null;
      stableTicks = 0;
    },
  };
}
