import {
  TUTORIAL_FRAMES_PER_SECOND,
  TUTORIAL_INTRO_MS,
  TUTORIAL_OUTRO_MS,
} from "./constants/tutorial";
import type { TutorialTimeline } from "./interfaces/tutorial";

export function framesFor(milliseconds: number): number {
  return Math.max(Math.round((milliseconds / 1000) * TUTORIAL_FRAMES_PER_SECOND), 1);
}

export function millisecondsFor(frames: number): number {
  return (frames / TUTORIAL_FRAMES_PER_SECOND) * 1000;
}

export function compositionSectionFrames(timeline: TutorialTimeline) {
  const introFrames = framesFor(TUTORIAL_INTRO_MS);
  const recordingFrames = framesFor(timeline.contentEndMs - timeline.contentStartMs);
  const outroFrames = framesFor(TUTORIAL_OUTRO_MS);
  return {
    introFrames,
    recordingFrames,
    outroFrames,
    totalFrames: introFrames + recordingFrames + outroFrames,
  };
}
