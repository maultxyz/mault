import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import type { PinnedModel } from "@magic-vault/shared";
import { MODEL_CACHE_DIR } from "@/lib/constants/storage-keys";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
}

function modelFile(model: PinnedModel): File {
  const dir = new Directory(Paths.document, MODEL_CACHE_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, `${model.sha256}.onnx`);
}

export async function loadPinnedModel(model: PinnedModel): Promise<Uint8Array> {
  const file = modelFile(model);
  if (file.exists) {
    const cached = await file.bytes();
    if ((await sha256Hex(cached)) === model.sha256) return cached;
    file.delete();
  }

  const url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.filename}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${model.filename}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const digest = await sha256Hex(bytes);
  if (digest !== model.sha256) {
    throw new Error(`Checksum mismatch for ${model.repo}/${model.filename}`);
  }
  file.create({ overwrite: true });
  await file.write(bytes);
  return bytes;
}
