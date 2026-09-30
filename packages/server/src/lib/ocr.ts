import { RawImage } from "@huggingface/transformers";
import type { OcrReadout, OcrRegion } from "@magic-vault/shared";
import { createWorker, PSM, type Worker } from "tesseract.js";
import {
  REGION_MARGIN_X,
  REGION_MARGIN_Y,
  TESSERACT_CACHE_PATH,
} from "./constants/ocr";

let workerPromise: Promise<Worker> | null = null;

async function createSingleLineWorker(): Promise<Worker> {
  const worker = await createWorker("eng", undefined, {
    cachePath: TESSERACT_CACHE_PATH,
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
  return worker;
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createSingleLineWorker().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function ocrRegions(
  buffer: Buffer,
  regions: OcrRegion[],
): Promise<OcrReadout> {
  const readout: OcrReadout = { name: "", setLine: "" };
  if (regions.length === 0) return readout;

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
      return { field: region.field, text: data.text.trim() };
    }),
  );

  for (const { field, text } of texts) {
    readout[field] = readout[field] ? `${readout[field]} ${text}` : text;
  }
  return readout;
}
