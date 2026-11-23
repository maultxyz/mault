import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { parseTutorialRunOptions } from "../lib/cli-arguments";
import { buildTranscript, buildWebVtt } from "../lib/caption-output";
import { compositionSectionFrames } from "../lib/composition-timing";
import {
  TUTORIAL_CAPTIONS_FILE_NAME,
  TUTORIAL_COMPOSITION_ID,
  TUTORIAL_INTRO_MS,
  TUTORIAL_POSTER_AT_INTRO_SHARE,
  TUTORIAL_POSTER_FILE_NAME,
  TUTORIAL_FRAMES_DIRECTORY_NAME,
  TUTORIAL_TIMELINE_FILE_NAME,
  TUTORIAL_TRANSCRIPT_FILE_NAME,
  TUTORIAL_VIDEO_FILE_NAME,
} from "../lib/constants/tutorial";
import {
  TUTORIAL_RENDER_ENTRY_POINT,
  TUTORIALS_OUTPUT_DIRECTORY,
} from "../lib/constants/tutorial-paths";
import type {
  TutorialCompositionProps,
  TutorialRunOptions,
  TutorialTimeline,
} from "../lib/interfaces/tutorial";
import { buildCaptionCues } from "../lib/timeline-math";

function recordedVariantDirectories(options: TutorialRunOptions, tutorialDirectory: string): string[] {
  if (!existsSync(tutorialDirectory)) return [];
  return readdirSync(tutorialDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((variantName) =>
      existsSync(path.join(tutorialDirectory, variantName, TUTORIAL_TIMELINE_FILE_NAME)),
    )
    .filter(
      (variantName) =>
        !options.viewportNames || options.viewportNames.some((viewportName) => viewportName === variantName),
    )
    .sort();
}

export async function renderTutorial(options: TutorialRunOptions): Promise<string[]> {
  const tutorialDirectory = path.join(TUTORIALS_OUTPUT_DIRECTORY, options.tutorialName);
  const variantNames = recordedVariantDirectories(options, tutorialDirectory);
  if (variantNames.length === 0) {
    throw new Error(
      `No recordings for "${options.tutorialName}" in ${tutorialDirectory}. Run the record step first.`,
    );
  }

  const serveUrl = await bundle({
    entryPoint: TUTORIAL_RENDER_ENTRY_POINT,
    publicDir: tutorialDirectory,
  });

  const renderedVideos: string[] = [];
  for (const variantName of variantNames) {
    const variantDirectory = path.join(tutorialDirectory, variantName);
    const timeline = JSON.parse(
      readFileSync(path.join(variantDirectory, TUTORIAL_TIMELINE_FILE_NAME), "utf8"),
    ) as TutorialTimeline;
    if (timeline.viewport.name !== variantName) {
      throw new Error(`${variantDirectory} holds a ${timeline.viewport.name} timeline.`);
    }
    const inputProps: TutorialCompositionProps = {
      timeline,
      framesPublicPath: `${variantName}/${TUTORIAL_FRAMES_DIRECTORY_NAME}`,
    };
    const composition = await selectComposition({ serveUrl, id: TUTORIAL_COMPOSITION_ID, inputProps });
    const videoPath = path.join(variantDirectory, TUTORIAL_VIDEO_FILE_NAME);

    console.log(`Rendering ${options.tutorialName} (${variantName})`);
    let lastLoggedPercent = -10;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: videoPath,
      inputProps,
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100);
        if (percent >= lastLoggedPercent + 10) {
          lastLoggedPercent = percent;
          console.log(`  ${percent}%`);
        }
      },
    });
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      output: path.join(variantDirectory, TUTORIAL_POSTER_FILE_NAME),
      frame: Math.round(compositionSectionFrames(timeline).introFrames * TUTORIAL_POSTER_AT_INTRO_SHARE),
      imageFormat: "jpeg",
    });

    const cues = buildCaptionCues(timeline);
    writeFileSync(path.join(variantDirectory, TUTORIAL_CAPTIONS_FILE_NAME), buildWebVtt(cues, TUTORIAL_INTRO_MS));
    writeFileSync(
      path.join(variantDirectory, TUTORIAL_TRANSCRIPT_FILE_NAME),
      buildTranscript(timeline.title, timeline.subtitle, cues),
    );
    renderedVideos.push(videoPath);
  }
  return renderedVideos;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const videos = await renderTutorial(parseTutorialRunOptions(process.argv.slice(2)));
  console.log(`Rendered ${videos.length} video(s):\n${videos.join("\n")}`);
}
