import type {
  OcrReadout,
  OcrRegion,
  OcrRegionTrace,
} from "@magic-vault/shared";
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
import type { OcrRectangle, OcrRegionLocation } from "./interfaces/ocr";
import { anchorRegion, regionBox, searchWindow } from "./ocr-anchor";
import {
  OCR_ANCHOR_MIN_WORD_CONFIDENCE,
  OCR_DARK_BACKGROUND_THRESHOLD,
  OCR_MULTILINE_REGION_LINES,
  OCR_TARGET_LINE_HEIGHT_PX,
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

function regionScale(region: OcrRegion, rectangle: OcrRectangle): number {
  const lines = region.multiline ? OCR_MULTILINE_REGION_LINES : 1;
  const scale = (OCR_TARGET_LINE_HEIGHT_PX * lines) / rectangle.height;
  return Math.min(OCR_UPSCALE_FACTOR, Math.max(1, scale));
}

async function prepareRegion(
  buffer: Buffer,
  rectangle: OcrRectangle,
  scale: number = OCR_UPSCALE_FACTOR,
): Promise<Buffer> {
  const gray = sharp(buffer)
    .extract(rectangle)
    .greyscale()
    .resize({ width: Math.round(rectangle.width * scale), kernel: "lanczos3" })
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
  scale: number,
): Promise<OcrPageLine[]> {
  await setMode(worker, PSM.SPARSE_TEXT);
  const { data } = await worker.recognize(
    await prepareRegion(buffer, window, scale),
    {},
    { blocks: true },
  );
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
): Promise<OcrRegionLocation> {
  const fallback = { box: regionBox(region), anchored: false, anchorText: null };
  const window = boxRectangle(
    searchWindow(region),
    imageWidth,
    imageHeight,
    0,
    0,
  );
  const expected = boxRectangle(
    regionBox(region),
    imageWidth,
    imageHeight,
    REGION_MARGIN_X,
    REGION_MARGIN_Y,
  );
  if (
    window.width <= 0 ||
    window.height <= 0 ||
    expected.width <= 0 ||
    expected.height <= 0
  ) {
    return fallback;
  }
  const lines = await readWindowLines(
    worker,
    buffer,
    window,
    imageWidth,
    imageHeight,
    regionScale(region, expected),
  );
  const anchor = anchorRegion(region, lines);
  return anchor
    ? { box: anchor.box, anchored: true, anchorText: anchor.text }
    : fallback;
}

async function readRegions(
  buffer: Buffer,
  regions: OcrRegion[],
  trace?: OcrRegionTrace[],
): Promise<OcrReadout> {
  const readout: OcrReadout = { name: "", setLine: "", number: "" };
  if (regions.length === 0) return readout;

  const worker = await getWorker();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();

  for (const region of regions) {
    const { box, anchored, anchorText } = await locateRegion(
      worker,
      buffer,
      region,
      width,
      height,
    );
    const rectangle = boxRectangle(
      box,
      width,
      height,
      REGION_MARGIN_X,
      REGION_MARGIN_Y,
    );
    if (rectangle.width <= 0 || rectangle.height <= 0) continue;
    await setMode(worker, region.multiline ? PSM.SINGLE_BLOCK : PSM.SINGLE_LINE);
    const prepared = await prepareRegion(
      buffer,
      rectangle,
      regionScale(region, rectangle),
    );
    const { data } = await worker.recognize(prepared);
    const text = data.text.trim();
    trace?.push({
      field: region.field,
      fallback: !!region.fallback,
      anchored,
      anchorText,
      box: {
        x0: rectangle.left / width,
        y0: rectangle.top / height,
        x1: (rectangle.left + rectangle.width) / width,
        y1: (rectangle.top + rectangle.height) / height,
      },
      imageDataUrl: `data:image/png;base64,${prepared.toString("base64")}`,
      text,
    });
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
  trace?: OcrRegionTrace[],
): Promise<OcrReadout> {
  return enqueue(() => readRegions(buffer, regions, trace));
}

export function ocrPageLines(buffer: Buffer): Promise<OcrPageLine[]> {
  return enqueue(() => readPageLines(buffer));
}
