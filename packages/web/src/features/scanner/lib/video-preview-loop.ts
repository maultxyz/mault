import {
  SCANNER_BACKGROUND_PREVIEW_INTERVAL_MS,
  SCANNER_CAMERA_FRAME_RATE,
  SCANNER_PREVIEW_FRAME_TOLERANCE_MS,
} from "@/lib/constants/scanner";
import type {
  VideoPreviewLoop,
  VideoPreviewLoopOptions,
} from "@/lib/interfaces/scanner";

const FOREGROUND_FRAME_INTERVAL_MS = 1000 / SCANNER_CAMERA_FRAME_RATE;

export function startVideoPreviewLoop({
  video,
  drawFrame,
  isForeground,
}: VideoPreviewLoopOptions): VideoPreviewLoop {
  let animationFrameId = 0;
  let backgroundTimerId: ReturnType<typeof setTimeout> | null = null;
  let lastDrawnAt = 0;
  let stopped = false;

  const cancelScheduledFrame = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (backgroundTimerId) clearTimeout(backgroundTimerId);
    animationFrameId = 0;
    backgroundTimerId = null;
  };

  const scheduleNextFrame = () => {
    if (stopped) return;
    if (isForeground()) {
      animationFrameId = requestAnimationFrame(tick);
    } else {
      backgroundTimerId = setTimeout(tick, SCANNER_BACKGROUND_PREVIEW_INTERVAL_MS);
    }
  };

  const tick = () => {
    animationFrameId = 0;
    backgroundTimerId = null;
    if (stopped) return;
    const now = performance.now();
    const minimumInterval = isForeground()
      ? FOREGROUND_FRAME_INTERVAL_MS - SCANNER_PREVIEW_FRAME_TOLERANCE_MS
      : 0;
    if (
      video.readyState >= video.HAVE_ENOUGH_DATA &&
      now - lastDrawnAt >= minimumInterval
    ) {
      if (!drawFrame()) {
        stopped = true;
        return;
      }
      lastDrawnAt = now;
    }
    scheduleNextFrame();
  };

  scheduleNextFrame();

  return {
    drawNow() {
      if (stopped) return;
      cancelScheduledFrame();
      lastDrawnAt = 0;
      tick();
    },
    stop() {
      stopped = true;
      cancelScheduledFrame();
    },
  };
}
