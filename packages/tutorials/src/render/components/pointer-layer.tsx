import { interpolate } from "remotion";
import {
  CLICK_RIPPLE_MS,
  CURSOR_ARRIVES_BEFORE_ACTION_MS,
  CURSOR_TRAVEL_MS,
} from "../../lib/constants/tutorial";
import {
  CLICK_RIPPLE_MAXIMUM_SIZE,
  DESKTOP_CURSOR_SIZE,
  TOUCH_INDICATOR_SIZE,
  TUTORIAL_COLORS,
} from "../../lib/constants/tutorial-style";
import type { CursorKeyframe, TutorialTimeline } from "../../lib/interfaces/tutorial";
import { interpolateKeyframes, recentPointerEvents } from "../../lib/timeline-math";

export function PointerLayer({
  timeline,
  cursorKeyframes,
  timelineMs,
  pixelsPerCssPixel,
  cameraScale,
}: {
  timeline: TutorialTimeline;
  cursorKeyframes: CursorKeyframe[];
  timelineMs: number;
  pixelsPerCssPixel: number;
  cameraScale: number;
}) {
  const sizeFactor = pixelsPerCssPixel / cameraScale;
  const ripples = recentPointerEvents(timeline, timelineMs, CLICK_RIPPLE_MS).map((event) => {
    const progress = (timelineMs - event.atMs) / CLICK_RIPPLE_MS;
    const size = CLICK_RIPPLE_MAXIMUM_SIZE * progress * sizeFactor;
    return (
      <div
        key={`ripple-${event.atMs}`}
        style={{
          position: "absolute",
          left: (event.target.x + event.target.width / 2) * pixelsPerCssPixel - size / 2,
          top: (event.target.y + event.target.height / 2) * pixelsPerCssPixel - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: TUTORIAL_COLORS.ripple,
          opacity: 1 - progress,
        }}
      />
    );
  });

  if (timeline.viewport.isMobile) {
    const upcomingTaps = recentPointerEvents(
      timeline,
      timelineMs + CURSOR_ARRIVES_BEFORE_ACTION_MS + CURSOR_TRAVEL_MS / 2,
      CURSOR_ARRIVES_BEFORE_ACTION_MS + CURSOR_TRAVEL_MS / 2 + CLICK_RIPPLE_MS,
    );
    const touches = upcomingTaps.map((event) => {
      const size = TOUCH_INDICATOR_SIZE * sizeFactor;
      const opacity = interpolate(
        timelineMs,
        [event.atMs - CURSOR_TRAVEL_MS / 2, event.atMs - CURSOR_ARRIVES_BEFORE_ACTION_MS, event.atMs + CLICK_RIPPLE_MS],
        [0, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      return (
        <div
          key={`touch-${event.atMs}`}
          style={{
            position: "absolute",
            left: (event.target.x + event.target.width / 2) * pixelsPerCssPixel - size / 2,
            top: (event.target.y + event.target.height / 2) * pixelsPerCssPixel - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            background: TUTORIAL_COLORS.touch,
            border: `${4 * sizeFactor}px solid ${TUTORIAL_COLORS.cursorOutline}`,
            opacity,
          }}
        />
      );
    });
    return (
      <>
        {ripples}
        {touches}
      </>
    );
  }

  const cursor = interpolateKeyframes(cursorKeyframes, timelineMs, ["x", "y"]);
  const cursorSize = DESKTOP_CURSOR_SIZE * sizeFactor;
  return (
    <>
      {ripples}
      <svg
        viewBox="0 0 24 24"
        width={cursorSize}
        height={cursorSize}
        style={{
          position: "absolute",
          left: cursor.x * pixelsPerCssPixel - cursorSize * 0.2,
          top: cursor.y * pixelsPerCssPixel - cursorSize * 0.1,
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
        }}
      >
        <path
          d="M5 3l14 8.5-6.2 1.3 3.7 6.6-2.7 1.5-3.7-6.6L5 18.5z"
          fill={TUTORIAL_COLORS.cursorFill}
          stroke={TUTORIAL_COLORS.cursorOutline}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}
