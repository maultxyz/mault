import type { SyncWorkerScope, SyncWorkerRequest } from "@/lib/interfaces/admin";
import {
  IMAGENET_MEAN,
  IMAGENET_STD,
  MILO_INPUT_SIZE,
  rgbaToChw,
  l2Normalize,
} from "@magic-vault/shared";
import * as ort from "onnxruntime-web/wasm";

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const scope = globalThis as unknown as SyncWorkerScope;

let session: ort.InferenceSession | null = null;

async function embedPixels(pixels: ArrayBuffer): Promise<number[]> {
  if (!session) throw new Error("Embedder is not ready.");
  const chw = rgbaToChw(
    {
      width: MILO_INPUT_SIZE,
      height: MILO_INPUT_SIZE,
      data: new Uint8ClampedArray(pixels),
    },
    IMAGENET_MEAN,
    IMAGENET_STD,
  );
  const tensor = new ort.Tensor("float32", chw, [
    1,
    3,
    MILO_INPUT_SIZE,
    MILO_INPUT_SIZE,
  ]);
  let outputs: ort.InferenceSession.ReturnType | undefined;
  try {
    outputs = await session.run({ [session.inputNames[0]]: tensor });
    const raw = outputs[session.outputNames[0]].data as Float32Array;
    return l2Normalize(raw);
  } finally {
    tensor.dispose();
    for (const output of Object.values(outputs ?? {})) output.dispose();
  }
}

scope.onmessage = (event: MessageEvent) => {
  const message = event.data as SyncWorkerRequest;
  if (message.type === "init" && message.buffer) {
    void ort.InferenceSession.create(message.buffer, {
      executionProviders: ["wasm"],
    })
      .then((created) => {
        session = created;
        scope.postMessage({ type: "ready" });
      })
      .catch((err: unknown) => {
        const text =
          err instanceof Error ? err.message : "Embedder failed to start.";
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
