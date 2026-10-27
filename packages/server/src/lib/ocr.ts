import type {
  OcrReadout,
  OcrRegion,
  OcrRegionTrace,
} from "@magic-vault/shared";
import sharp from "sharp";
import {
  OCR_MIN_LINE_CONFIDENCE,
  PADDLE_OCR_SAME_LINE_MAX_GAP_RATIO,
  PADDLE_OCR_SAME_LINE_MIN_OVERLAP,
  REGION_MARGIN_X,
  REGION_MARGIN_Y,
} from "./constants/ocr";
import type {
  OcrBox,
  OcrPageLine,
  OcrPageWord,
} from "./interfaces/ocr-calibration";
import type {
  OcrRectangle,
  OcrRegionLocation,
  OcrTextBox,
} from "./interfaces/ocr";
import { anchorRegion, lineText, regionBox } from "./ocr-anchor";
import { readTextBoxes, recognizeRectangle } from "./paddle-ocr";

let queue: Promise<unknown> = Promise.resolve();

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

function wordsOf({ box, text }: OcrTextBox): OcrPageWord[] {
  const width = box.x1 - box.x0;
  const words: OcrPageWord[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const start = match.index / text.length;
    const end = (match.index + match[0].length) / text.length;
    words.push({
      text: match[0],
      box: { ...box, x0: box.x0 + start * width, x1: box.x0 + end * width },
    });
  }
  return words;
}

function verticalOverlap(a: OcrBox, b: OcrBox): number {
  const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return overlap / Math.min(a.y1 - a.y0, b.y1 - b.y0);
}

function joinsLine(line: OcrPageLine, box: OcrBox): boolean {
  const lineHeight = line.box.y1 - line.box.y0;
  return (
    verticalOverlap(line.box, box) >= PADDLE_OCR_SAME_LINE_MIN_OVERLAP &&
    box.x0 - line.box.x1 <= lineHeight * PADDLE_OCR_SAME_LINE_MAX_GAP_RATIO
  );
}

export function toPageLines(textBoxes: OcrTextBox[]): OcrPageLine[] {
  const lines: OcrPageLine[] = [];
  const confident = textBoxes
    .filter((textBox) => textBox.confidence >= OCR_MIN_LINE_CONFIDENCE)
    .sort((a, b) => a.box.x0 - b.box.x0);
  for (const textBox of confident) {
    const words = wordsOf(textBox);
    if (words.length === 0) continue;
    const line = lines.find((candidate) => joinsLine(candidate, textBox.box));
    if (!line) {
      lines.push({ words, box: textBox.box });
      continue;
    }
    line.words.push(...words);
    line.box = {
      x0: Math.min(line.box.x0, textBox.box.x0),
      y0: Math.min(line.box.y0, textBox.box.y0),
      x1: Math.max(line.box.x1, textBox.box.x1),
      y1: Math.max(line.box.y1, textBox.box.y1),
    };
  }
  return lines.sort((a, b) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0);
}

async function readRectangleText(
  buffer: Buffer,
  rectangle: OcrRectangle,
  multiline: boolean,
): Promise<string> {
  const lines = toPageLines(await readTextBoxes(buffer, rectangle));
  if (lines.length > 0) {
    return multiline
      ? lines.map(lineText).join("\n")
      : lineText(
          lines.reduce((widest, line) =>
            line.box.x1 - line.box.x0 > widest.box.x1 - widest.box.x0
              ? line
              : widest,
          ),
        );
  }
  if (multiline) return "";
  const single = await recognizeRectangle(buffer, rectangle);
  return single && single.confidence >= OCR_MIN_LINE_CONFIDENCE
    ? single.text
    : "";
}

function locateRegion(
  region: OcrRegion,
  lines: OcrPageLine[],
): OcrRegionLocation {
  const anchor = anchorRegion(region, lines);
  return anchor
    ? { box: anchor.box, anchored: true, anchorText: anchor.text }
    : { box: regionBox(region), anchored: false, anchorText: null };
}

async function readRegions(
  buffer: Buffer,
  regions: OcrRegion[],
  trace?: OcrRegionTrace[],
): Promise<OcrReadout> {
  const readout: OcrReadout = { name: "", setLine: "", number: "" };
  if (regions.length === 0) return readout;

  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  if (width === 0 || height === 0) return readout;
  const lines = toPageLines(await readTextBoxes(buffer));

  for (const region of regions) {
    const { box, anchored, anchorText } = locateRegion(region, lines);
    const rectangle = boxRectangle(
      box,
      width,
      height,
      REGION_MARGIN_X,
      REGION_MARGIN_Y,
    );
    if (rectangle.width <= 0 || rectangle.height <= 0) continue;
    const text =
      anchorText ??
      (await readRectangleText(buffer, rectangle, !!region.multiline));
    if (trace) {
      const crop = await sharp(buffer).extract(rectangle).png().toBuffer();
      trace.push({
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
        imageDataUrl: `data:image/png;base64,${crop.toString("base64")}`,
        text,
      });
    }
    readout[region.field] = readout[region.field]
      ? `${readout[region.field]}\n${text}`
      : text;
  }
  return readout;
}

async function readPageLines(buffer: Buffer): Promise<OcrPageLine[]> {
  return toPageLines(await readTextBoxes(buffer));
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
