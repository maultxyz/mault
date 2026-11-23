import type { TutorialCompositionProps } from "../interfaces/tutorial";
import { TUTORIAL_VIEWPORTS } from "./tutorial";

export const PLACEHOLDER_TUTORIAL_PROPS: TutorialCompositionProps = {
  framesPublicPath: "",
  timeline: {
    screenFrames: [],
    tutorialName: "placeholder",
    language: "en",
    viewport: TUTORIAL_VIEWPORTS.desktop,
    title: "Tutorial",
    subtitle: null,
    contentStartMs: 0,
    contentEndMs: 1000,
    events: [],
  },
};
