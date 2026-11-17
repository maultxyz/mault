import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CORNER_DETECTOR_MODEL,
  MILO_MODEL,
  type PinnedModel,
} from "@magic-vault/shared";
import {
  PADDLE_OCR_DETECTION_MODEL,
  PADDLE_OCR_DICTIONARY,
  PADDLE_OCR_RECOGNITION_MODEL,
} from "../constants/ocr";

function cacheRoot(): string {
  return (
    process.env.COLLECTORVISION_CACHE ??
    path.join(process.cwd(), ".cache", "collectorvision")
  );
}

async function sha256Of(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function resolvePinnedModel(model: PinnedModel): Promise<string> {
  const dir = path.join(cacheRoot(), "models", model.sha256);
  const destination = path.join(dir, model.filename);

  if (existsSync(destination) && (await sha256Of(destination)) === model.sha256) {
    return destination;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.filename}`;
  console.log(`[model-registry] Downloading ${model.repo}@${model.revision}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  await writeFile(destination, Buffer.from(await res.arrayBuffer()));

  const digest = await sha256Of(destination);
  if (digest !== model.sha256) {
    throw new Error(
      `Checksum mismatch for ${model.repo}/${model.filename}: expected ${model.sha256}, got ${digest}`,
    );
  }
  console.log(`[model-registry] Verified ${model.repo}/${model.filename} (sha256 ok).`);
  return destination;
}

export function resolveMiloModelPath(): Promise<string> {
  return resolvePinnedModel(MILO_MODEL);
}

export function resolveCardDetectorModelPath(): Promise<string> {
  return resolvePinnedModel(CORNER_DETECTOR_MODEL);
}

export function resolvePaddleOcrModelPaths(): Promise<{
  detection: string;
  recognition: string;
  dictionary: string;
}> {
  return Promise.all([
    resolvePinnedModel(PADDLE_OCR_DETECTION_MODEL),
    resolvePinnedModel(PADDLE_OCR_RECOGNITION_MODEL),
    resolvePinnedModel(PADDLE_OCR_DICTIONARY),
  ]).then(([detection, recognition, dictionary]) => ({
    detection,
    recognition,
    dictionary,
  }));
}
