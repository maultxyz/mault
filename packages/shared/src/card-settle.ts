import {
  CARD_SETTLE_MAX_CORNER_SHIFT_RATIO,
  CARD_SETTLE_STABLE_TICKS,
  PHONE_CAMERA_CARD_SETTLE_MIN_GAP_MS,
} from "./constants/scanner.constant";
import type { WaitUntilCardSettlesOptions } from "./interfaces/phone-camera.interface";
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

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), Math.max(0, ms)));
}

export async function waitUntilCardSettles({
  observeCard,
  maxWaitMs,
  isCancelled = () => false,
  minimumGapBetweenObservationsMs = PHONE_CAMERA_CARD_SETTLE_MIN_GAP_MS,
}: WaitUntilCardSettlesOptions): Promise<boolean> {
  const tracker = createCardSettleTracker();
  const deadline = Date.now() + maxWaitMs;
  while (!isCancelled()) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return false;
    const observation = await Promise.race([
      observeCard().catch(() => null),
      delay(remainingMs),
    ]);
    if (isCancelled()) return false;
    const settled = tracker.observe(
      observation ?? { cardPresent: false, contour: null },
      observation?.frameLongSidePx ?? 0,
    );
    if (settled) return true;
    const gapMs = Math.min(minimumGapBetweenObservationsMs, deadline - Date.now());
    if (gapMs > 0) await delay(gapMs);
  }
  return false;
}
