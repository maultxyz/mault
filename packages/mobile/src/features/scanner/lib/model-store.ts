import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import type { PinnedModel } from "@magic-vault/shared";
import { MODEL_CACHE_DIR, MODEL_DOWNLOAD_FILE_SUFFIX } from "@/lib/constants/storage-keys";
import type { ModelDownloadProgressListener } from "@/lib/interfaces/scanner";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
}

function modelDirectory(): Directory {
  const dir = new Directory(Paths.document, MODEL_CACHE_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function modelFile(model: PinnedModel): File {
  return new File(modelDirectory(), `${model.sha256}.onnx`);
}

export function isPinnedModelDownloaded(model: PinnedModel): boolean {
  return modelFile(model).exists;
}

export function deletePinnedModelFile(model: PinnedModel): void {
  const file = modelFile(model);
  if (file.exists) file.delete();
}

export async function ensurePinnedModelFile(
  model: PinnedModel,
  onDownloadProgress?: ModelDownloadProgressListener,
): Promise<string> {
  const file = modelFile(model);
  if (file.exists) return file.uri;

  const download = new File(modelDirectory(), `${model.sha256}${MODEL_DOWNLOAD_FILE_SUFFIX}`);
  if (download.exists) download.delete();
  const url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.filename}`;
  await File.downloadFileAsync(url, download, {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => onDownloadProgress?.(bytesWritten, totalBytes),
  });
  const digest = await sha256Hex(await download.bytes());
  if (digest !== model.sha256) {
    download.delete();
    throw new Error(`Checksum mismatch for ${model.repo}/${model.filename}`);
  }
  await download.move(file);
  return modelFile(model).uri;
}
