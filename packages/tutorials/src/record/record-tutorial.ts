import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { parseTutorialRunOptions } from "../lib/cli-arguments";
import {
  RECORDING_TAIL_MS,
  TUTORIAL_FRAMES_DIRECTORY_NAME,
  TUTORIAL_LANGUAGE,
  TUTORIAL_TIMELINE_FILE_NAME,
  TUTORIAL_VIEWPORTS,
} from "../lib/constants/tutorial";
import { TUTORIAL_AUTH_STATE_PATH, TUTORIALS_OUTPUT_DIRECTORY } from "../lib/constants/tutorial-paths";
import type {
  TutorialDefinition,
  TutorialRunOptions,
  TutorialTimeline,
  TutorialViewportName,
} from "../lib/interfaces/tutorial";
import {
  findCaptionProblems,
  loadCaptionFile,
  loadTutorialDefinition,
} from "../lib/tutorial-sources";
import {
  assertAppIsReachable,
  assertSavedSessionHasOrganization,
  prepareTutorialContext,
  tutorialBaseUrl,
} from "./browser-setup";
import { startScreencast } from "./screencast-recorder";
import { createTutorialSession, waitForAppPageReady } from "./tutorial-session";

async function recordVariant(options: {
  browser: Browser;
  tutorialName: string;
  definition: TutorialDefinition;
  viewportName: TutorialViewportName;
}): Promise<string> {
  const { browser, tutorialName, definition, viewportName } = options;
  const language = TUTORIAL_LANGUAGE;
  const viewport = TUTORIAL_VIEWPORTS[viewportName];
  const captions = loadCaptionFile(tutorialName);
  const baseUrl = tutorialBaseUrl();
  const variantDirectory = path.join(TUTORIALS_OUTPUT_DIRECTORY, tutorialName, viewportName);
  rmSync(variantDirectory, { recursive: true, force: true });
  mkdirSync(variantDirectory, { recursive: true });

  const context = await browser.newContext({
    storageState: TUTORIAL_AUTH_STATE_PATH,
    viewport: { width: viewport.cssWidth, height: viewport.cssHeight },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    locale: language,
    colorScheme: "light",
  });
  await prepareTutorialContext(context, language, viewport);
  const page = await context.newPage();
  const recordingStartedAtEpochMs = Date.now();
  const screencast = await startScreencast({
    page,
    viewport,
    framesDirectory: path.join(variantDirectory, TUTORIAL_FRAMES_DIRECTORY_NAME),
    recordingStartedAtEpochMs,
  });
  const session = createTutorialSession({
    page,
    baseUrl,
    language,
    viewport,
    captions,
    recordingStartedAtEpochMs,
  });

  try {
    await page.goto(new URL(definition.startPath, baseUrl).toString());
    await waitForAppPageReady(page);
    if (definition.prepare) {
      await definition.prepare(session.context);
      session.events.length = 0;
    }
    const contentStartMs = session.elapsedMs();
    await definition.run(session.context);
    await page.waitForTimeout(RECORDING_TAIL_MS);
    const contentEndMs = session.elapsedMs();
    const screenFrames = await screencast.stop();
    await context.close();
    if (screenFrames.length === 0) throw new Error("The screencast captured no frames.");

    const timeline: TutorialTimeline = {
      tutorialName,
      language,
      viewport,
      title: captions.title,
      subtitle: captions.subtitle ?? null,
      contentStartMs,
      contentEndMs,
      events: session.events,
      screenFrames,
    };
    writeFileSync(
      path.join(variantDirectory, TUTORIAL_TIMELINE_FILE_NAME),
      `${JSON.stringify(timeline, null, 2)}\n`,
    );
    return variantDirectory;
  } catch (error) {
    await page
      .screenshot({ path: path.join(variantDirectory, "failure.png") })
      .catch(() => undefined);
    await screencast.stop().catch(() => undefined);
    await context.close().catch(() => undefined);
    throw new Error(
      `Recording ${tutorialName} (${viewportName}) failed at ${page.url()}. Screenshot: ${path.join(variantDirectory, "failure.png")}`,
      { cause: error },
    );
  }
}

export async function recordTutorial(options: TutorialRunOptions): Promise<string[]> {
  if (!existsSync(TUTORIAL_AUTH_STATE_PATH)) {
    throw new Error(
      "No saved session. Run `pnpm --filter @magic-vault/tutorials sign-in` and sign in with the demo account first.",
    );
  }
  assertSavedSessionHasOrganization(TUTORIAL_AUTH_STATE_PATH);
  await assertAppIsReachable(tutorialBaseUrl());
  const captionProblems = findCaptionProblems(options.tutorialName);
  if (captionProblems.length > 0) throw new Error(captionProblems.join("\n"));

  const definition = await loadTutorialDefinition(options.tutorialName);
  const viewportNames = options.viewportNames ?? definition.viewports;
  const browser = await chromium.launch();
  const variantDirectories: string[] = [];
  try {
    for (const viewportName of viewportNames) {
      console.log(`Recording ${options.tutorialName} (${viewportName})`);
      variantDirectories.push(
        await recordVariant({ browser, tutorialName: options.tutorialName, definition, viewportName }),
      );
    }
  } finally {
    await browser.close();
  }
  return variantDirectories;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const directories = await recordTutorial(parseTutorialRunOptions(process.argv.slice(2)));
  console.log(`Recorded ${directories.length} variant(s):\n${directories.join("\n")}`);
}
