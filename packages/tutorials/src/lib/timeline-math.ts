import {
  CURSOR_ARRIVES_BEFORE_ACTION_MS,
  CURSOR_TRAVEL_MS,
  ZOOM_HOLD_AFTER_ACTION_MS,
  ZOOM_TARGET_SHARE_OF_SCREEN,
  ZOOM_TRANSITION_MS,
} from "./constants/tutorial";
import type {
  CameraKeyframe,
  CameraState,
  CaptionCue,
  CursorKeyframe,
  TutorialScreenFrame,
  TutorialTargetBox,
  TutorialTimeline,
  TutorialTimelineEvent,
  TutorialViewport,
} from "./interfaces/tutorial";

type PointerEvent = Extract<TutorialTimelineEvent, { kind: "pointer" }>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function easeInOutCubic(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function overviewCameraState(viewport: TutorialViewport): CameraState {
  return { scale: 1, centerX: viewport.cssWidth / 2, centerY: viewport.cssHeight / 2 };
}

export function clampCameraState(state: CameraState, viewport: TutorialViewport): CameraState {
  const halfVisibleWidth = viewport.cssWidth / (2 * state.scale);
  const halfVisibleHeight = viewport.cssHeight / (2 * state.scale);
  return {
    scale: state.scale,
    centerX: clamp(state.centerX, halfVisibleWidth, viewport.cssWidth - halfVisibleWidth),
    centerY: clamp(state.centerY, halfVisibleHeight, viewport.cssHeight - halfVisibleHeight),
  };
}

export function zoomedCameraStateFor(
  target: TutorialTargetBox,
  viewport: TutorialViewport,
): CameraState {
  const scaleToFitWidth = (viewport.cssWidth * ZOOM_TARGET_SHARE_OF_SCREEN) / Math.max(target.width, 1);
  const scaleToFitHeight = (viewport.cssHeight * ZOOM_TARGET_SHARE_OF_SCREEN) / Math.max(target.height, 1);
  const scale = clamp(Math.min(scaleToFitWidth, scaleToFitHeight), 1, viewport.maximumZoomScale);
  return clampCameraState(
    {
      scale,
      centerX: target.x + target.width / 2,
      centerY: target.y + target.height / 2,
    },
    viewport,
  );
}

function pointerEventsOf(timeline: TutorialTimeline): PointerEvent[] {
  return timeline.events.filter((event): event is PointerEvent => event.kind === "pointer");
}

export function buildCameraKeyframes(timeline: TutorialTimeline): CameraKeyframe[] {
  const { viewport } = timeline;
  const overview = overviewCameraState(viewport);
  const intents: { arrivesAtMs: number; state: CameraState }[] = [];
  for (const event of timeline.events) {
    if (event.kind === "pointer") {
      intents.push({
        arrivesAtMs: event.atMs - CURSOR_ARRIVES_BEFORE_ACTION_MS,
        state: event.zoomsIn ? zoomedCameraStateFor(event.target, viewport) : overview,
      });
    } else if (event.kind === "zoomOut") {
      intents.push({ arrivesAtMs: event.atMs, state: overview });
    }
  }

  const intentsWithAutomaticZoomOut: typeof intents = [];
  intents.forEach((intent, index) => {
    intentsWithAutomaticZoomOut.push(intent);
    if (intent.state.scale <= 1) return;
    const zoomOutStartsAtMs = intent.arrivesAtMs + CURSOR_ARRIVES_BEFORE_ACTION_MS + ZOOM_HOLD_AFTER_ACTION_MS;
    const nextIntent = intents[index + 1];
    const nextTransitionStartsAtMs = nextIntent
      ? nextIntent.arrivesAtMs - ZOOM_TRANSITION_MS
      : Number.POSITIVE_INFINITY;
    if (nextTransitionStartsAtMs > zoomOutStartsAtMs + ZOOM_TRANSITION_MS) {
      intentsWithAutomaticZoomOut.push({
        arrivesAtMs: zoomOutStartsAtMs + ZOOM_TRANSITION_MS,
        state: overview,
      });
    }
  });

  const keyframes: CameraKeyframe[] = [{ atMs: timeline.contentStartMs, ...overview }];
  let previousState = overview;
  for (const intent of intentsWithAutomaticZoomOut) {
    const lastAtMs = keyframes[keyframes.length - 1].atMs;
    const transitionStartsAtMs = Math.max(intent.arrivesAtMs - ZOOM_TRANSITION_MS, lastAtMs);
    const arrivesAtMs = Math.max(intent.arrivesAtMs, transitionStartsAtMs + 1);
    keyframes.push({ atMs: transitionStartsAtMs, ...previousState });
    keyframes.push({ atMs: arrivesAtMs, ...intent.state });
    previousState = intent.state;
  }
  return keyframes;
}

export function buildCursorKeyframes(timeline: TutorialTimeline): CursorKeyframe[] {
  const { viewport } = timeline;
  const keyframes: CursorKeyframe[] = [
    { atMs: timeline.contentStartMs, x: viewport.cssWidth * 0.62, y: viewport.cssHeight * 0.68 },
  ];
  for (const event of pointerEventsOf(timeline)) {
    const previous = keyframes[keyframes.length - 1];
    const arrivesAtMs = Math.max(event.atMs - CURSOR_ARRIVES_BEFORE_ACTION_MS, previous.atMs + 1);
    const travelStartsAtMs = Math.max(arrivesAtMs - CURSOR_TRAVEL_MS, previous.atMs);
    keyframes.push({ atMs: travelStartsAtMs, x: previous.x, y: previous.y });
    keyframes.push({
      atMs: arrivesAtMs,
      x: event.target.x + event.target.width / 2,
      y: event.target.y + event.target.height / 2,
    });
  }
  return keyframes;
}

export function interpolateKeyframes<Keyframe extends { atMs: number }>(
  keyframes: Keyframe[],
  atMs: number,
  numericFields: (keyof Keyframe)[],
): Keyframe {
  if (atMs <= keyframes[0].atMs) return keyframes[0];
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (atMs > next.atMs) continue;
    const previous = keyframes[index - 1];
    const duration = next.atMs - previous.atMs;
    const progress = duration <= 0 ? 1 : easeInOutCubic((atMs - previous.atMs) / duration);
    const interpolated = { ...next, atMs };
    for (const field of numericFields) {
      const from = previous[field] as number;
      const to = next[field] as number;
      (interpolated[field] as number) = from + (to - from) * progress;
    }
    return interpolated;
  }
  return keyframes[keyframes.length - 1];
}

export function buildCaptionCues(timeline: TutorialTimeline): CaptionCue[] {
  const captions = timeline.events.filter(
    (event): event is Extract<TutorialTimelineEvent, { kind: "caption" }> => event.kind === "caption",
  );
  return captions
    .map((caption, index) => ({
      startMs: Math.max(caption.atMs - timeline.contentStartMs, 0),
      endMs: (captions[index + 1]?.atMs ?? timeline.contentEndMs) - timeline.contentStartMs,
      text: caption.text,
    }))
    .filter((cue) => cue.text.trim().length > 0 && cue.endMs > cue.startMs);
}

export function screenFrameAt(screenFrames: TutorialScreenFrame[], atMs: number): TutorialScreenFrame | null {
  if (screenFrames.length === 0) return null;
  let low = 0;
  let high = screenFrames.length - 1;
  let latest = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (screenFrames[middle].atMs <= atMs) {
      latest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return screenFrames[latest];
}

export function recentPointerEvents(
  timeline: TutorialTimeline,
  atMs: number,
  withinMs: number,
): PointerEvent[] {
  return pointerEventsOf(timeline).filter(
    (event) => event.action !== "hover" && atMs >= event.atMs && atMs - event.atMs <= withinMs,
  );
}
