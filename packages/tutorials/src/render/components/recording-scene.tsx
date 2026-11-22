import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { millisecondsFor } from "../../lib/composition-timing";
import {
  MOBILE_DEVICE_BEZEL,
  MOBILE_DEVICE_RADIUS,
  MOBILE_DEVICE_SCREEN_HEIGHT,
  MOBILE_DEVICE_TOP,
  TUTORIAL_COLORS,
} from "../../lib/constants/tutorial-style";
import type { TutorialTimeline } from "../../lib/interfaces/tutorial";
import {
  buildCameraKeyframes,
  buildCaptionCues,
  buildCursorKeyframes,
  interpolateKeyframes,
  screenFrameAt,
} from "../../lib/timeline-math";
import { CaptionBar } from "./caption-bar";
import { PointerLayer } from "./pointer-layer";

function ScreenStage({
  timeline,
  framesPublicPath,
  displayWidth,
  timelineMs,
}: {
  timeline: TutorialTimeline;
  framesPublicPath: string;
  displayWidth: number;
  timelineMs: number;
}) {
  const { viewport } = timeline;
  const cameraKeyframes = useMemo(() => buildCameraKeyframes(timeline), [timeline]);
  const cursorKeyframes = useMemo(() => buildCursorKeyframes(timeline), [timeline]);
  const camera = interpolateKeyframes(cameraKeyframes, timelineMs, ["scale", "centerX", "centerY"]);
  const screenFrame = screenFrameAt(timeline.screenFrames, timelineMs);
  const pixelsPerCssPixel = viewport.videoWidth / viewport.cssWidth;
  const displayScale = displayWidth / viewport.videoWidth;
  const translateX = viewport.videoWidth / 2 - camera.centerX * pixelsPerCssPixel * camera.scale;
  const translateY = viewport.videoHeight / 2 - camera.centerY * pixelsPerCssPixel * camera.scale;

  return (
    <div
      style={{
        position: "relative",
        width: displayWidth,
        height: viewport.videoHeight * displayScale,
        overflow: "hidden",
        background: TUTORIAL_COLORS.canvas,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: viewport.videoWidth,
          height: viewport.videoHeight,
          transformOrigin: "0 0",
          transform: `scale(${displayScale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0 0",
            transform: `translate(${translateX}px, ${translateY}px) scale(${camera.scale})`,
          }}
        >
          {screenFrame && (
            <Img
              src={staticFile(`${framesPublicPath}/${screenFrame.fileName}`)}
              style={{ width: viewport.videoWidth, height: viewport.videoHeight }}
            />
          )}
          <PointerLayer
            timeline={timeline}
            cursorKeyframes={cursorKeyframes}
            timelineMs={timelineMs}
            pixelsPerCssPixel={pixelsPerCssPixel}
            cameraScale={camera.scale}
          />
        </div>
      </div>
    </div>
  );
}

export function RecordingScene({
  timeline,
  framesPublicPath,
}: {
  timeline: TutorialTimeline;
  framesPublicPath: string;
}) {
  const frame = useCurrentFrame();
  const contentMs = millisecondsFor(frame);
  const timelineMs = timeline.contentStartMs + contentMs;
  const cues = useMemo(() => buildCaptionCues(timeline), [timeline]);
  const { viewport } = timeline;

  if (!viewport.isMobile) {
    return (
      <AbsoluteFill style={{ background: TUTORIAL_COLORS.canvas }}>
        <ScreenStage
          timeline={timeline}
          framesPublicPath={framesPublicPath}
          displayWidth={viewport.compositionWidth}
          timelineMs={timelineMs}
        />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56 }}>
          <CaptionBar cues={cues} contentMs={contentMs} isMobile={false} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const screenWidth = Math.round((MOBILE_DEVICE_SCREEN_HEIGHT * viewport.videoWidth) / viewport.videoHeight);
  const deviceBottom = MOBILE_DEVICE_TOP + MOBILE_DEVICE_SCREEN_HEIGHT + MOBILE_DEVICE_BEZEL * 2;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${TUTORIAL_COLORS.primarySoft} 0%, ${TUTORIAL_COLORS.canvas} 60%)`,
        alignItems: "center",
      }}
    >
      <div
        style={{
          marginTop: MOBILE_DEVICE_TOP,
          padding: MOBILE_DEVICE_BEZEL,
          borderRadius: MOBILE_DEVICE_RADIUS,
          background: TUTORIAL_COLORS.deviceFrame,
          boxShadow: "0 30px 80px rgba(16, 24, 40, 0.25)",
        }}
      >
        <div style={{ borderRadius: MOBILE_DEVICE_RADIUS - MOBILE_DEVICE_BEZEL, overflow: "hidden" }}>
          <ScreenStage
            timeline={timeline}
            framesPublicPath={framesPublicPath}
            displayWidth={screenWidth}
            timelineMs={timelineMs}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: deviceBottom,
          bottom: 0,
          left: 40,
          right: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CaptionBar cues={cues} contentMs={contentMs} isMobile />
      </div>
    </AbsoluteFill>
  );
}
