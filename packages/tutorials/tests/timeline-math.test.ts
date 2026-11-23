import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTranscript, buildWebVtt } from "../src/lib/caption-output";
import { TUTORIAL_VIEWPORTS, ZOOM_HOLD_AFTER_ACTION_MS } from "../src/lib/constants/tutorial";
import type { TutorialTimeline } from "../src/lib/interfaces/tutorial";
import {
  buildCameraKeyframes,
  buildCaptionCues,
  buildCursorKeyframes,
  interpolateKeyframes,
  screenFrameAt,
  zoomedCameraStateFor,
} from "../src/lib/timeline-math";
import { findCaptionProblems, listTutorialNames } from "../src/lib/tutorial-sources";
import { translateWebString } from "../src/lib/web-translations";

const viewport = TUTORIAL_VIEWPORTS.desktop;

function timelineWith(events: TutorialTimeline["events"]): TutorialTimeline {
  return {
    tutorialName: "test",
    language: "en",
    viewport,
    title: "Title",
    subtitle: null,
    contentStartMs: 1000,
    contentEndMs: 20_000,
    events,
    screenFrames: [],
  };
}

test("the latest screen frame at or before a moment is shown", () => {
  const screenFrames = [
    { fileName: "a.jpg", atMs: 100 },
    { fileName: "b.jpg", atMs: 200 },
    { fileName: "c.jpg", atMs: 400 },
  ];
  assert.equal(screenFrameAt(screenFrames, 50)?.fileName, "a.jpg");
  assert.equal(screenFrameAt(screenFrames, 200)?.fileName, "b.jpg");
  assert.equal(screenFrameAt(screenFrames, 399)?.fileName, "b.jpg");
  assert.equal(screenFrameAt(screenFrames, 5000)?.fileName, "c.jpg");
  assert.equal(screenFrameAt([], 10), null);
});

test("zoom stays inside the frame for a target in the corner", () => {
  const state = zoomedCameraStateFor({ x: 0, y: 0, width: 40, height: 20 }, viewport);
  assert.equal(state.scale, viewport.maximumZoomScale);
  assert.equal(state.centerX, viewport.cssWidth / (2 * state.scale));
  assert.equal(state.centerY, viewport.cssHeight / (2 * state.scale));
});

test("large targets are not zoomed", () => {
  const state = zoomedCameraStateFor({ x: 0, y: 0, width: 1200, height: 700 }, viewport);
  assert.equal(state.scale, 1);
});

test("camera zooms in for an action and back out after a long gap", () => {
  const timeline = timelineWith([
    { kind: "pointer", atMs: 3000, action: "click", target: { x: 600, y: 300, width: 80, height: 30 }, zoomsIn: true },
  ]);
  const keyframes = buildCameraKeyframes(timeline);
  const atAction = interpolateKeyframes(keyframes, 3000, ["scale", "centerX", "centerY"]);
  assert.ok(atAction.scale > 1);
  const later = interpolateKeyframes(keyframes, 3000 + ZOOM_HOLD_AFTER_ACTION_MS + 2000, ["scale"]);
  assert.equal(later.scale, 1);
  for (let index = 1; index < keyframes.length; index += 1) {
    assert.ok(keyframes[index].atMs >= keyframes[index - 1].atMs);
  }
});

test("cursor arrives at the target before the action", () => {
  const timeline = timelineWith([
    { kind: "pointer", atMs: 3000, action: "click", target: { x: 100, y: 100, width: 50, height: 50 }, zoomsIn: false },
  ]);
  const cursor = interpolateKeyframes(buildCursorKeyframes(timeline), 3000, ["x", "y"]);
  assert.equal(cursor.x, 125);
  assert.equal(cursor.y, 125);
});

test("caption cues run until the next caption and become WebVTT", () => {
  const timeline = timelineWith([
    { kind: "caption", atMs: 1500, captionKey: "first", text: "First" },
    { kind: "caption", atMs: 4000, captionKey: "second", text: "Second" },
  ]);
  const cues = buildCaptionCues(timeline);
  assert.deepEqual(cues, [
    { startMs: 500, endMs: 3000, text: "First" },
    { startMs: 3000, endMs: 19_000, text: "Second" },
  ]);
  const webVtt = buildWebVtt(cues, 2000);
  assert.match(webVtt, /^WEBVTT/);
  assert.match(webVtt, /00:00:02\.500 --> 00:00:05\.000\nFirst/);
  assert.equal(buildTranscript("Title", null, cues), "Title\n\n1. First\n2. Second\n");
});

test("web translations resolve namespaces, plurals and values", () => {
  assert.equal(translateWebString("en", "collections:createDialog.create"), "Create");
  assert.equal(translateWebString("en", "search:resultsCount", { count: 2 }), "2 results");
  assert.throws(() => translateWebString("en", "search:doesNotExist"));
});

test("every tutorial has valid captions", () => {
  for (const tutorialName of listTutorialNames()) {
    assert.deepEqual(findCaptionProblems(tutorialName), [], tutorialName);
  }
});
