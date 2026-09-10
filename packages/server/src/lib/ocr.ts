import { RawImage } from "@huggingface/transformers";
import type { OcrRegion } from "@magic-vault/shared";
import { createWorker, type Worker } from "tesseract.js";
import {
  REGION_MARGIN_X,
  REGION_MARGIN_Y,
  TESSERACT_CACHE_PATH,
} from "./constants/ocr";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", undefined, {
      cachePath: TESSERACT_CACHE_PATH,
    });
  }
  return workerPromise;
}

export async function ocrRegions(
  buffer: Buffer,
  regions: OcrRegion[],
): Promise<string> {
  if (regions.length === 0) return "";

  const worker = await getWorker();
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(buffer)]));

  const texts = await Promise.all(
    regions.map(async (region) => {
      const left = Math.max(
        0,
        Math.round((region.x - REGION_MARGIN_X) * image.width),
      );
      const top = Math.max(
        0,
        Math.round((region.y - REGION_MARGIN_Y) * image.height),
      );
      const right = Math.min(
        image.width,
        Math.round((region.x + region.width + REGION_MARGIN_X) * image.width),
      );
      const bottom = Math.min(
        image.height,
        Math.round((region.y + region.height + REGION_MARGIN_Y) * image.height),
      );
      const rectangle = {
        left,
        top,
        width: right - left,
        height: bottom - top,
      };
      const { data } = await worker.recognize(buffer, { rectangle });
      return data.text;
    }),
  );

  return texts.join(" ");
}
