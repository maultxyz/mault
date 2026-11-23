import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { SCREENCAST_JPEG_QUALITY } from "../lib/constants/tutorial";
import type { TutorialScreenFrame, TutorialViewport } from "../lib/interfaces/tutorial";

export async function startScreencast(options: {
  page: Page;
  viewport: TutorialViewport;
  framesDirectory: string;
  recordingStartedAtEpochMs: number;
}) {
  const { page, viewport, framesDirectory, recordingStartedAtEpochMs } = options;
  mkdirSync(framesDirectory, { recursive: true });
  const devtoolsSession = await page.context().newCDPSession(page);
  const screenFrames: TutorialScreenFrame[] = [];
  const pendingWrites: Promise<void>[] = [];

  devtoolsSession.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    devtoolsSession.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
    const capturedAtEpochMs = metadata.timestamp ? metadata.timestamp * 1000 : Date.now();
    const fileName = `${String(screenFrames.length).padStart(6, "0")}.jpg`;
    screenFrames.push({ fileName, atMs: capturedAtEpochMs - recordingStartedAtEpochMs });
    pendingWrites.push(writeFile(path.join(framesDirectory, fileName), Buffer.from(data, "base64")));
  });

  await devtoolsSession.send("Page.startScreencast", {
    format: "jpeg",
    quality: SCREENCAST_JPEG_QUALITY,
    maxWidth: viewport.videoWidth,
    maxHeight: viewport.videoHeight,
    everyNthFrame: 1,
  });

  return {
    async stop(): Promise<TutorialScreenFrame[]> {
      await devtoolsSession.send("Page.stopScreencast").catch(() => undefined);
      await Promise.all(pendingWrites);
      await devtoolsSession.detach().catch(() => undefined);
      return [...screenFrames].sort((first, second) => first.atMs - second.atMs);
    },
  };
}
