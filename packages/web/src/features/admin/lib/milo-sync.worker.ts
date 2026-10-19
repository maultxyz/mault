import {
  IMAGENET_MEAN,
  IMAGENET_STD,
  MILO_INPUT_SIZE,
} from "@magic-vault/shared";
import * as ort from "onnxruntime-web/wasm";

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

interface SyncWorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
}

const scope = globalThis as unknown as SyncWorkerScope;

let session: ort.InferenceSession | null = null;

function toChw(data: Uint8ClampedArray): Float32Array {
  const plane = MILO_INPUT_SIZE * MILO_INPUT_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    chw[i] = (data[o] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    chw[plane + i] = (data[o + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    chw[2 * plane + i] = (data[o + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return chw;
}

async function embedPixels(pixels: ArrayBuffer): Promise<number[]> {
  if (!session) throw new Error("Embedder is not ready.");
  const tensor = new ort.Tensor("float32", toChw(new Uint8ClampedArray(pixels)), [
    1,
    3,
    MILO_INPUT_SIZE,
    MILO_INPUT_SIZE,
  ]);
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  const raw = outputs[session.outputNames[0]].data as Float32Array;
  let normSq = 0;
  for (let i = 0; i < raw.length; i++) normSq += raw[i] * raw[i];
  const norm = Math.sqrt(normSq);
  const denom = norm > 1e-8 ? norm : 1;
  const embedding = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i] / denom;
  return embedding;
}

scope.onmessage = (event: MessageEvent) => {
  const message = event.data as {
    type?: string;
    id?: number;
    buffer?: ArrayBuffer;
    pixels?: ArrayBuffer;
  };
  if (message.type === "init" && message.buffer) {
    void ort.InferenceSession.create(message.buffer, {
      executionProviders: ["wasm"],
    })
      .then((created) => {
        session = created;
        scope.postMessage({ type: "ready" });
      })
      .catch((err: unknown) => {
        const text = err instanceof Error ? err.message : "Embedder failed to start.";
        scope.postMessage({ type: "init-error", message: text });
      });
    return;
  }
  if (message.type === "embed" && message.pixels && message.id !== undefined) {
    const id = message.id;
    void embedPixels(message.pixels)
      .then((embedding) => {
        scope.postMessage({ type: "embedding", id, embedding });
      })
      .catch((err: unknown) => {
        const text = err instanceof Error ? err.message : "Embedding failed.";
        scope.postMessage({ type: "error", id, message: text });
      });
  }
};
