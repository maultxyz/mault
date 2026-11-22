import type { Locator, Page } from "playwright";
import {
  AFTER_POINTER_ACTION_MS,
  CAPTION_MINIMUM_READING_MS,
  CAPTION_READING_MS_PER_CHARACTER,
  CURSOR_ARRIVES_BEFORE_ACTION_MS,
  CURSOR_TRAVEL_MS,
  TUTORIAL_MAIN_HEADING_SELECTOR,
  TUTORIAL_PAGE_READY_TIMEOUT_MS,
  TUTORIAL_PAGE_SETTLE_MS,
  TYPING_DELAY_PER_CHARACTER_MS,
} from "../lib/constants/tutorial";
import type {
  TutorialCaptionFile,
  TutorialContext,
  TutorialLanguage,
  TutorialPointerAction,
  TutorialTargetBox,
  TutorialTimelineEvent,
  TutorialViewport,
} from "../lib/interfaces/tutorial";
import { translateWebString } from "../lib/web-translations";
import { clearFakeCamera, showCardToFakeCamera } from "./fake-camera";

export async function waitForAppPageReady(page: Page): Promise<void> {
  await page
    .locator(TUTORIAL_MAIN_HEADING_SELECTOR)
    .first()
    .waitFor({ state: "visible", timeout: TUTORIAL_PAGE_READY_TIMEOUT_MS });
  await page.waitForTimeout(TUTORIAL_PAGE_SETTLE_MS);
}

export function captionReadingMs(text: string): number {
  return Math.max(CAPTION_MINIMUM_READING_MS, text.length * CAPTION_READING_MS_PER_CHARACTER);
}

export function createTutorialSession(options: {
  page: Page;
  baseUrl: string;
  language: TutorialLanguage;
  viewport: TutorialViewport;
  captions: TutorialCaptionFile;
  recordingStartedAtEpochMs: number;
}) {
  const { page, baseUrl, language, viewport, captions, recordingStartedAtEpochMs } = options;
  const events: TutorialTimelineEvent[] = [];
  const elapsedMs = () => Date.now() - recordingStartedAtEpochMs;
  const pause = (milliseconds: number) => page.waitForTimeout(Math.max(milliseconds, 0));

  async function targetBoxOf(target: Locator): Promise<TutorialTargetBox> {
    await target.waitFor({ state: "visible", timeout: TUTORIAL_PAGE_READY_TIMEOUT_MS });
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Tutorial target has no bounding box: ${target}`);
    return box;
  }

  async function movePointerTo(target: Locator, action: TutorialPointerAction, zoomsIn: boolean) {
    const box = await targetBoxOf(target);
    const actionAtMs = elapsedMs() + CURSOR_TRAVEL_MS + CURSOR_ARRIVES_BEFORE_ACTION_MS;
    events.push({ kind: "pointer", atMs: actionAtMs, action, target: box, zoomsIn });
    await pause(actionAtMs - elapsedMs());
  }

  async function activate(target: Locator) {
    if (viewport.isMobile) await target.tap();
    else await target.click();
  }

  const context: TutorialContext = {
    page,
    language,
    viewport,
    isMobile: viewport.isMobile,
    ui: (translationKey, interpolationValues) =>
      translateWebString(language, translationKey, interpolationValues),
    async step(captionKey, action) {
      const text = captions.steps[captionKey];
      if (text === undefined) {
        throw new Error(`Caption "steps.${captionKey}" is missing from captions.json.`);
      }
      const startedAtMs = elapsedMs();
      events.push({ kind: "caption", atMs: startedAtMs, captionKey, text });
      await action?.();
      await pause(captionReadingMs(text) - (elapsedMs() - startedAtMs));
    },
    async click(target, pointerOptions) {
      await movePointerTo(target, "click", pointerOptions?.zoomsIn ?? true);
      await activate(target);
      await pause(AFTER_POINTER_ACTION_MS);
    },
    async type(target, text, typeOptions) {
      await movePointerTo(target, "type", typeOptions?.zoomsIn ?? true);
      await activate(target);
      await target.pressSequentially(text, { delay: TYPING_DELAY_PER_CHARACTER_MS });
      if (typeOptions?.pressEnterAfterTyping) await target.press("Enter");
      await pause(AFTER_POINTER_ACTION_MS);
    },
    async hover(target, pointerOptions) {
      await movePointerTo(target, "hover", pointerOptions?.zoomsIn ?? false);
      if (!viewport.isMobile) await target.hover();
      await pause(AFTER_POINTER_ACTION_MS);
    },
    async press(key) {
      await page.keyboard.press(key);
      await pause(AFTER_POINTER_ACTION_MS);
    },
    async goto(appPath) {
      events.push({ kind: "zoomOut", atMs: elapsedMs() });
      await page.goto(new URL(appPath, baseUrl).toString());
      await waitForAppPageReady(page);
    },
    zoomOut() {
      events.push({ kind: "zoomOut", atMs: elapsedMs() });
    },
    pause,
    showCardToCamera: (cardName) => showCardToFakeCamera(page, cardName),
    clearCamera: () => clearFakeCamera(page),
  };

  return { context, events, elapsedMs };
}
