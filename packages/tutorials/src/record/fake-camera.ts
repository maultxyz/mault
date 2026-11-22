import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import type { TutorialViewport } from "../lib/interfaces/tutorial";
import {
  FAKE_CAMERA_CARD_HEIGHT_SHARE,
  FAKE_CAMERA_DEVICE_ID,
  FAKE_CAMERA_DEVICE_LABEL,
  FAKE_CAMERA_FRAME_INTERVAL_MS,
  FAKE_CAMERA_HEIGHT,
  FAKE_CAMERA_SLIDE_MS,
  FAKE_CAMERA_WIDTH,
  SCRYFALL_CARD_IMAGE_URL,
  TUTORIAL_HTTP_USER_AGENT,
} from "../lib/constants/tutorial";
import {
  FAKE_CAMERA_BROWSER_SCRIPT_PATH,
  TUTORIAL_CARD_IMAGE_CACHE_DIRECTORY,
} from "../lib/constants/tutorial-paths";

export async function installFakeCamera(context: BrowserContext, viewport: TutorialViewport): Promise<void> {
  const config = {
    turnsCardCounterClockwise: !viewport.isMobile,
    width: FAKE_CAMERA_WIDTH,
    height: FAKE_CAMERA_HEIGHT,
    frameIntervalMs: FAKE_CAMERA_FRAME_INTERVAL_MS,
    cardHeightShare: FAKE_CAMERA_CARD_HEIGHT_SHARE,
    slideMs: FAKE_CAMERA_SLIDE_MS,
    deviceId: FAKE_CAMERA_DEVICE_ID,
    deviceLabel: FAKE_CAMERA_DEVICE_LABEL,
  };
  await context.addInitScript({ content: `window.__tutorialCameraConfig = ${JSON.stringify(config)};` });
  await context.addInitScript({ path: FAKE_CAMERA_BROWSER_SCRIPT_PATH });
}

async function loadCardImageDataUrl(cardName: string): Promise<string> {
  mkdirSync(TUTORIAL_CARD_IMAGE_CACHE_DIRECTORY, { recursive: true });
  const cacheKey = createHash("sha256").update(cardName.toLowerCase()).digest("hex").slice(0, 24);
  const cachePath = path.join(TUTORIAL_CARD_IMAGE_CACHE_DIRECTORY, `${cacheKey}.jpg`);
  if (!existsSync(cachePath)) {
    const response = await fetch(`${SCRYFALL_CARD_IMAGE_URL}${encodeURIComponent(cardName)}`, {
      headers: { "User-Agent": TUTORIAL_HTTP_USER_AGENT, Accept: "image/*" },
    });
    if (!response.ok) {
      throw new Error(`Couldn't download the image for "${cardName}" (HTTP ${response.status}). Check the card name.`);
    }
    writeFileSync(cachePath, Buffer.from(await response.arrayBuffer()));
  }
  return `data:image/jpeg;base64,${readFileSync(cachePath).toString("base64")}`;
}

export async function showCardToFakeCamera(page: Page, cardName: string): Promise<void> {
  const imageDataUrl = await loadCardImageDataUrl(cardName);
  await page.evaluate(
    (dataUrl) =>
      (window as unknown as { __tutorialCamera: { showCard(url: string): Promise<void> } }).__tutorialCamera.showCard(
        dataUrl,
      ),
    imageDataUrl,
  );
}

export async function clearFakeCamera(page: Page): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as { __tutorialCamera: { clear(): void } }).__tutorialCamera.clear(),
  );
}
