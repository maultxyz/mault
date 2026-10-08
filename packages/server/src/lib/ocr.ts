import type { OcrReadout, OcrRegion } from "@magic-vault/shared";
import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import {
  OCR_DARK_BACKGROUND_THRESHOLD,
  OCR_UPSCALE_FACTOR,
  REGION_MARGIN_X,
  REGION_MARGIN_Y,
  TESSERACT_CACHE_PATH,
} from "./constants/ocr";

let workerPromise: Promise<Worker> | null = null;
let currentMode: PSM | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", undefined, {
      cachePath: TESSERACT_CACHE_PATH,
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function setMode(worker: Worker, mode: PSM): Promise<void> {
  if (currentMode === mode) return;
  await worker.setParameters({ tessedit_pageseg_mode: mode });
  currentMode = mode;
}

function regionRectangle(
  region: OcrRegion,
  imageWidth: number,
  imageHeight: number,
) {
  const left = Math.max(0, Math.round((region.x - REGION_MARGIN_X) * imageWidth));
  const top = Math.max(0, Math.round((region.y - REGION_MARGIN_Y) * imageHeight));
  const right = Math.min(
    imageWidth,
    Math.round((region.x + region.width + REGION_MARGIN_X) * imageWidth),
  );
  const bottom = Math.min(
    imageHeight,
    Math.round((region.y + region.height + REGION_MARGIN_Y) * imageHeight),
  );
  return { left, top, width: right - left, height: bottom - top };
}

async function prepareRegion(
  buffer: Buffer,
  rectangle: ReturnType<typeof regionRectangle>,
): Promise<Buffer> {
  const gray = sharp(buffer)
    .extract(rectangle)
    .greyscale()
    .resize({ width: rectangle.width * OCR_UPSCALE_FACTOR, kernel: "lanczos3" })
    .normalise();
  const pixels = await gray.clone().raw().toBuffer();
  const mean = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  const darkBackground = mean < OCR_DARK_BACKGROUND_THRESHOLD;
  return (darkBackground ? gray.negate({ alpha: false }) : gray)
    .png()
    .toBuffer();
}

async function readRegions(
  buffer: Buffer,
  regions: OcrRegion[],
): Promise<OcrReadout> {
  const readout: OcrReadout = { name: "", setLine: "", number: "" };
  if (regions.length === 0) return readout;

  const worker = await getWorker();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();

  for (const region of regions) {
    const rectangle = regionRectangle(region, width, height);
    if (rectangle.width <= 0 || rectangle.height <= 0) continue;
    await setMode(worker, region.multiline ? PSM.SINGLE_BLOCK : PSM.SINGLE_LINE);
    const { data } = await worker.recognize(
      await prepareRegion(buffer, rectangle),
    );
    const text = data.text.trim();
    readout[region.field] = readout[region.field]
      ? `${readout[region.field]}\n${text}`
      : text;
  }
  return readout;
}

export function ocrRegions(
  buffer: Buffer,
  regions: OcrRegion[],
): Promise<OcrReadout> {
  const run = queue.then(() => readRegions(buffer, regions));
  queue = run.catch(() => undefined);
  return run;
}
