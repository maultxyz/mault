import type { Locator, Page } from "playwright";

export type TutorialViewportName = "desktop" | "mobile";

export type TutorialLanguage = "en";

export interface TutorialViewport {
  name: TutorialViewportName;
  cssWidth: number;
  cssHeight: number;
  deviceScaleFactor: number;
  videoWidth: number;
  videoHeight: number;
  compositionWidth: number;
  compositionHeight: number;
  isMobile: boolean;
  maximumZoomScale: number;
}

export interface TutorialTargetBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TutorialPointerAction = "click" | "type" | "hover";

export type TutorialTimelineEvent =
  | { kind: "caption"; atMs: number; captionKey: string; text: string }
  | {
      kind: "pointer";
      atMs: number;
      action: TutorialPointerAction;
      target: TutorialTargetBox;
      zoomsIn: boolean;
    }
  | { kind: "zoomOut"; atMs: number };

export interface TutorialScreenFrame {
  fileName: string;
  atMs: number;
}

export interface TutorialTimeline {
  tutorialName: string;
  language: TutorialLanguage;
  viewport: TutorialViewport;
  title: string;
  subtitle: string | null;
  contentStartMs: number;
  contentEndMs: number;
  events: TutorialTimelineEvent[];
  screenFrames: TutorialScreenFrame[];
}

export interface TutorialCaptionFile {
  title: string;
  subtitle?: string;
  steps: Record<string, string>;
}

export interface TutorialPointerOptions {
  zoomsIn?: boolean;
}

export interface TutorialTypeOptions extends TutorialPointerOptions {
  pressEnterAfterTyping?: boolean;
}

export interface TutorialContext {
  page: Page;
  language: TutorialLanguage;
  viewport: TutorialViewport;
  isMobile: boolean;
  ui(translationKey: string, interpolationValues?: Record<string, string | number>): string;
  step(captionKey: string, action?: () => Promise<void>): Promise<void>;
  click(target: Locator, options?: TutorialPointerOptions): Promise<void>;
  type(target: Locator, text: string, options?: TutorialTypeOptions): Promise<void>;
  hover(target: Locator, options?: TutorialPointerOptions): Promise<void>;
  press(key: string): Promise<void>;
  goto(appPath: string): Promise<void>;
  zoomOut(): void;
  pause(milliseconds: number): Promise<void>;
  showCardToCamera(cardName: string): Promise<void>;
  clearCamera(): Promise<void>;
}

export interface TutorialDefinition {
  startPath: string;
  viewports: TutorialViewportName[];
  prepare?(tutorial: TutorialContext): Promise<void>;
  run(tutorial: TutorialContext): Promise<void>;
}

export interface CameraKeyframe {
  atMs: number;
  scale: number;
  centerX: number;
  centerY: number;
}

export interface CameraState {
  scale: number;
  centerX: number;
  centerY: number;
}

export interface CursorKeyframe {
  atMs: number;
  x: number;
  y: number;
}

export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface TutorialRunOptions {
  tutorialName: string;
  viewportNames: TutorialViewportName[] | null;
}

export type TutorialCompositionProps = {
  timeline: TutorialTimeline;
  framesPublicPath: string;
};
