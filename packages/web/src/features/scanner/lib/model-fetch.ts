// Client-side vision models are pulled from HuggingFace at runtime and cached
// in IndexedDB (keyed by content hash, not URL) rather than committed to the
// repo as static binary assets. Mirrors packages/server/src/lib/models/
// model-registry.ts's pattern, adapted for the browser (Web Crypto +
// IndexedDB instead of node:crypto + the filesystem).

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
    // IndexedDB unavailable (private browsing, disabled storage, etc) - fall
    // through to a fresh download every time rather than failing outright.
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
  } catch {
    // Non-fatal - this session just re-downloads next time.
  }
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

// Pinned against CollectorVision's published HuggingFace repos. Re-pin
// deliberately: download the new revision, verify its sha256 by hand, then
// update these records - don't resolve against a moving "main" branch, so
// every deployed build uses a known-verified artifact.

// fastweb-single 1.39 ("corndog"): EfficientViT-B0 + global-token SimCC,
// MIT-licensed. Same 384x384 input / corners+presence+sharpness output
// contract as CollectorVision's Cornelius, ~28% smaller and ~2.8x faster on
// CPU with comparable accuracy (see the model card). Needs
// graphOptimizationLevel: "disabled" - the default optimizer level hits a
// "two nodes with same node name (/GatherSliceToSplitFusion/)" fusion-pass
// bug against this graph on at least onnxruntime-node 1.21.0.
export const FASTWEB_DETECTOR_MODEL: PinnedModel = {
  repo: "HanClinto/ccgdetector-fastweb-single",
  revision: "66ffd4976ec57bda0f6ea2d83e15ca6a3add7dd9",
  filename: "fastweb-single-1.39.onnx",
  sha256: "05d2b90b928a5a3bf0f49aa90aa86211b2103d9c347c238fd18b4f544b3cb8ca",
};

// Milo embedder - kept in sync with packages/server/src/lib/models/model-registry.ts's pin.
export const MILO_MODEL: PinnedModel = {
  repo: "HanClinto/milo",
  revision: "9bcc5e809e936b8c5630d1e7101aae1de1e76621",
  filename: "model.onnx",
  sha256: "bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df",
};
