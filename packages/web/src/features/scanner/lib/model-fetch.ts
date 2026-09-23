export interface PinnedModel {
  repo: string;
  revision: string;
  filename: string;
  sha256: string;
}

const DB_NAME = "magic-vault-vision-models";
const STORE_NAME = "models";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCached(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function writeCached(key: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(buffer, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchPinnedModel(model: PinnedModel): Promise<ArrayBuffer> {
  const cached = await readCached(model.sha256);
  if (cached) return cached;

  const url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.filename}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();

  const digest = await sha256Hex(buffer);
  if (digest !== model.sha256) {
    throw new Error(
      `Checksum mismatch for ${model.repo}/${model.filename}: expected ${model.sha256}, got ${digest}`,
    );
  }

  await writeCached(model.sha256, buffer);
  return buffer;
}

export const FASTWEB_DETECTOR_MODEL: PinnedModel = {
  repo: "HanClinto/ccgdetector-fastweb-single",
  revision: "66ffd4976ec57bda0f6ea2d83e15ca6a3add7dd9",
  filename: "fastweb-single-1.39.onnx",
  sha256: "05d2b90b928a5a3bf0f49aa90aa86211b2103d9c347c238fd18b4f544b3cb8ca",
};

export const MILO_MODEL: PinnedModel = {
  repo: "HanClinto/milo",
  revision: "9bcc5e809e936b8c5630d1e7101aae1de1e76621",
  filename: "model.onnx",
  sha256: "bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df",
};
