import sharp from "sharp";
import { toPortraitCardImage } from "../card-image";
import {
  OCR_CALIBRATION_IMAGE_DPI,
  OCR_CALIBRATION_IMAGE_HEIGHT,
  OCR_CALIBRATION_IMAGE_PROXY_PATTERN,
  OCR_CALIBRATION_IMAGE_WIDTH,
  OCR_CALIBRATION_TEXT_ROW_DEVIATION_RATIO,
} from "../constants/ocr-calibration";
import type {
  OcrBox,
  OcrPageLine,
  OcrPagePixels,
} from "../interfaces/ocr-calibration";
import { unionBoxes } from "./match";

export function sourceImageUrl(url: string): string | null {
  const proxied = url.match(OCR_CALIBRATION_IMAGE_PROXY_PATTERN);
  if (proxied) {
    try {
      return decodeURIComponent(proxied[1]);
    } catch {
      return null;
    }
  }
  return /^https?:\/\//i.test(url) ? url : null;
}

export async function fetchCalibrationImage(
  url: string,
  headers: Record<string, string>,
): Promise<Buffer> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
  return toPortraitCardImage(Buffer.from(await response.arrayBuffer()));
}

export async function calibrationPages(buffer: Buffer): Promise<Buffer[]> {
  const gray = sharp(buffer)
    .rotate()
    .resize(OCR_CALIBRATION_IMAGE_WIDTH, OCR_CALIBRATION_IMAGE_HEIGHT, {
      fit: "fill",
      kernel: "lanczos3",
    })
    .greyscale()
    .normalise()
    .withMetadata({ density: OCR_CALIBRATION_IMAGE_DPI });
  return Promise.all([
    gray.clone().png().toBuffer(),
    gray.clone().negate({ alpha: false }).png().toBuffer(),
  ]);
}

export async function pagePixels(page: Buffer): Promise<OcrPagePixels> {
  const { data, info } = await sharp(page)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function rowDeviation(
  pixels: OcrPagePixels,
  y: number,
  left: number,
  right: number,
): number {
  const offset = y * pixels.width;
  let sum = 0;
  let squares = 0;
  for (let x = left; x < right; x++) {
    const value = pixels.data[offset + x];
    sum += value;
    squares += value * value;
  }
  const count = right - left;
  const mean = sum / count;
  return Math.sqrt(Math.max(0, squares / count - mean * mean));
}

export function tightenBox(pixels: OcrPagePixels, box: OcrBox): OcrBox {
  const left = Math.max(0, Math.floor(box.x0 * pixels.width));
  const right = Math.min(pixels.width, Math.ceil(box.x1 * pixels.width));
  const top = Math.max(0, Math.floor(box.y0 * pixels.height));
  const bottom = Math.min(pixels.height, Math.ceil(box.y1 * pixels.height));
  if (right - left < 1 || bottom - top < 1) return box;

  const deviations = Array.from({ length: bottom - top }, (_, i) =>
    rowDeviation(pixels, top + i, left, right),
  );
  const peak = deviations.indexOf(Math.max(...deviations));
  const threshold = deviations[peak] * OCR_CALIBRATION_TEXT_ROW_DEVIATION_RATIO;
  let start = peak;
  while (start > 0 && deviations[start - 1] >= threshold) start--;
  let end = peak;
  while (end < deviations.length - 1 && deviations[end + 1] >= threshold) end++;

  return {
    ...box,
    y0: (top + start) / pixels.height,
    y1: (top + end + 1) / pixels.height,
  };
}

export function tightenLines(
  lines: OcrPageLine[],
  pixels: OcrPagePixels,
): OcrPageLine[] {
  return lines.map((line) => {
    const words = line.words.map((word) => ({
      ...word,
      box: tightenBox(pixels, word.box),
    }));
    return { words, box: unionBoxes(words.map(({ box }) => box)) };
  });
}
