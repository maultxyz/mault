import { InferenceSession, Tensor } from "onnxruntime-react-native";
import type { PinnedModel } from "@magic-vault/shared";
import type { ModelDownloadProgressListener } from "@/lib/interfaces/scanner";
import { deletePinnedModelFile, ensurePinnedModelFile } from "./model-store";

const sessions = new Map<string, Promise<InferenceSession>>();
const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  queues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

async function createSessionFromModelFile(
  model: PinnedModel,
  options: InferenceSession.SessionOptions | undefined,
  onDownloadProgress: ModelDownloadProgressListener | undefined,
): Promise<InferenceSession> {
  const sessionOptions: InferenceSession.SessionOptions = { executionProviders: ["cpu"], ...options };
  const modelUri = await ensurePinnedModelFile(model, onDownloadProgress);
  try {
    return await InferenceSession.create(modelUri, sessionOptions);
  } catch {
    deletePinnedModelFile(model);
    return InferenceSession.create(await ensurePinnedModelFile(model, onDownloadProgress), sessionOptions);
  }
}

function loadSession(
  key: string,
  model: PinnedModel,
  options?: InferenceSession.SessionOptions,
  onDownloadProgress?: ModelDownloadProgressListener,
): Promise<InferenceSession> {
  let promise = sessions.get(key);
  if (!promise) {
    promise = createSessionFromModelFile(model, options, onDownloadProgress);
    const created = promise;
    created.catch(() => {
      if (sessions.get(key) === created) sessions.delete(key);
    });
    sessions.set(key, created);
  }
  return promise;
}

export function warmModel(
  key: string,
  model: PinnedModel,
  options?: InferenceSession.SessionOptions,
  onDownloadProgress?: ModelDownloadProgressListener,
): Promise<void> {
  return loadSession(key, model, options, onDownloadProgress).then(() => undefined);
}

export function runModel(
  key: string,
  model: PinnedModel,
  input: Float32Array,
  dims: number[],
  options?: InferenceSession.SessionOptions,
): Promise<InferenceSession.OnnxValueMapType> {
  return enqueue(key, async () => {
    const session = await loadSession(key, model, options);
    const tensor = new Tensor("float32", input, dims);
    return session.run({ [session.inputNames[0]]: tensor });
  });
}

export function firstOutput(
  outputs: InferenceSession.OnnxValueMapType,
): Float32Array {
  const first = Object.values(outputs)[0];
  return first.data as Float32Array;
}
