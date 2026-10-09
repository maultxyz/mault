import type { OcrReadout, OcrRegion } from "@magic-vault/shared";
import sharp from "sharp";
import {
  createWorker,
  PSM,
  type Bbox,
  type Block,
  type Worker,
} from "tesseract.js";
import { OCR_CALIBRATION_MIN_WORD_CONFIDENCE } from "./constants/ocr-calibration";
import type { OcrBox, OcrPageLine } from "./interfaces/ocr-calibration";
import type { OcrRectangle } from "./interfaces/ocr";
import { anchorRegion, regionBox, searchWindow } from "./ocr-anchor";
import {
  OCR_ANCHOR_MIN_WORD_CONFIDENCE,
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

function boxRectangle(
  box: OcrBox,
  imageWidth: number,
  imageHeight: number,
  marginX: number,
  marginY: number,
): OcrRectangle {
  const left = Math.max(0, Math.round((box.x0 - marginX) * imageWidth));
  const top = Math.max(0, Math.round((box.y0 - marginY) * imageHeight));
  const right = Math.min(imageWidth, Math.round((box.x1 + marginX) * imageWidth));
  const bottom = Math.min(
    imageHeight,
    Math.round((box.y1 + marginY) * imageHeight),
  );
  return { left, top, width: right - left, height: bottom - top };
}

async function prepareRegion(
  buffer: Buffer,
  rectangle: OcrRectangle,
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

function linesFromBlocks(
  blocks: Block[] | null,
  minWordConfidence: number,
  toBox: (bbox: Bbox) => OcrBox,
): OcrPageLine[] {
  return (blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => {
        const words = line.words
          .filter(
            (word) =>
              word.text.trim() && word.confidence >= minWordConfidence,
          )
          .map((word) => ({ text: word.text.trim(), box: toBox(word.bbox) }));
        if (words.length === 0) return [];
        return [{ words, box: toBox(line.bbox) }];
      }),
    ),
  );
}

async function readWindowLines(
  worker: Worker,
  buffer: Buffer,
  window: OcrRectangle,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrPageLine[]> {
  await setMode(worker, PSM.SPARSE_TEXT);
  const { data } = await worker.recognize(
    await prepareRegion(buffer, window),
    {},
    { blocks: true },
  );
  const scale = OCR_UPSCALE_FACTOR;
  return linesFromBlocks(data.blocks, OCR_ANCHOR_MIN_WORD_CONFIDENCE, (bbox) => ({
    x0: (window.left + bbox.x0 / scale) / imageWidth,
    y0: (window.top + bbox.y0 / scale) / imageHeight,
    x1: (window.left + bbox.x1 / scale) / imageWidth,
    y1: (window.top + bbox.y1 / scale) / imageHeight,
  }));
}

async function locateRegion(
  worker: Worker,
  buffer: Buffer,
  region: OcrRegion,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrBox> {
  const window = boxRectangle(
    searchWindow(region),
    imageWidth,
    imageHeight,
    0,
    0,
  );
  if (window.width <= 0 || window.height <= 0) return regionBox(region);
  const lines = await readWindowLines(
    worker,
    buffer,
    window,
    imageWidth,
    imageHeight,
  );
  return anchorRegion(region, lines) ?? regionBox(region);
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
    const box = await locateRegion(worker, buffer, region, width, height);
    const rectangle = boxRectangle(
      box,
      width,
      height,
      REGION_MARGIN_X,
      REGION_MARGIN_Y,
    );
    if (rectangle.width <= 0 || rectangle.height <= 0) continue;
    await setMode(worker, region.multiline ? PSM.SINGLE_BLOCK : PSM.SINGLE_LINE);
    const { data } = await worker.recognize(
      await prepareRegion(buffer, rectangle),
    );
    const text = data.text.trim();
    readout[region.field] = readout[region.field]
      ? `${readout[region.field]}
${text}`
      : text;
  }
  return readout;
}

async function readPageLines(buffer: Buffer): Promise<OcrPageLine[]> {
  const worker = await getWorker();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  if (width === 0 || height === 0) return [];
  await setMode(worker, PSM.SPARSE_TEXT);
  const { data } = await worker.recognize(buffer, {}, { blocks: true });
  return linesFromBlocks(
    data.blocks,
    OCR_CALIBRATION_MIN_WORD_CONFIDENCE,
    (bbox) => ({
      x0: bbox.x0 / width,
      y0: bbox.y0 / height,
      x1: bbox.x1 / width,
      y1: bbox.y1 / height,
    }),
  );
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

export function ocrRegions(
  buffer: Buffer,
  regions: OcrRegion[],
): Promise<OcrReadout> {
  return enqueue(() => readRegions(buffer, regions));
}

export function ocrPageLines(buffer: Buffer): Promise<OcrPageLine[]> {
  return enqueue(() => readPageLines(buffer));
}
