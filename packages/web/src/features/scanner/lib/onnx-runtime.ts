import * as ort from "onnxruntime-web/webgpu";
import { fetchPinnedModel, type PinnedModel } from "./model-fetch";

// onnxruntime-web locates its WASM/worker files relative to its own module
// URL (import.meta.url) by default - left alone here (no wasmPaths override)
// so that resolution keeps working. See vite.config.ts's optimizeDeps.exclude
// for why the dev server needs a matching config to make that resolution
// actually correct, and why an explicit `public/`-hosted override doesn't
// work: Vite's dev server refuses to `import()` a file that lives in
// `public/` (only static fetches are allowed there), and onnxruntime-web's
// threaded WASM loader does exactly that for its companion .mjs file.

let webGpuSupportPromise: Promise<boolean> | null = null;

function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}

async function detectWebGpuSupport(): Promise<boolean> {
  // CollectorVision (the upstream project these models come from) disables
  // WebGPU on Firefox - it has produced invalid Metal shaders there for both
  // the corner detector and embedder models. Mirroring that exclusion here
  // rather than re-discovering it the hard way.
  if (isFirefox()) return false;
  const gpu = (
    navigator as unknown as {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

export function isWebGpuSupported(): Promise<boolean> {
  if (!webGpuSupportPromise) webGpuSupportPromise = detectWebGpuSupport();
  return webGpuSupportPromise;
}

const sessions = new Map<string, Promise<ort.InferenceSession>>();

export async function loadOnnxSession(
  key: string,
  model: PinnedModel,
  extraOptions?: Partial<ort.InferenceSession.SessionOptions>,
): Promise<ort.InferenceSession> {
  let promise = sessions.get(key);
  if (!promise) {
    promise = (async () => {
      const buffer = await fetchPinnedModel(model);
      const preferWebGpu = await isWebGpuSupported();
      if (preferWebGpu) {
        try {
          return await ort.InferenceSession.create(buffer, {
            executionProviders: ["webgpu", "wasm"],
            ...extraOptions,
          });
        } catch (err) {
          console.warn(
            `[onnx-runtime] ${key}: WebGPU session failed, falling back to WASM`,
            err,
          );
        }
      }
      return ort.InferenceSession.create(buffer, {
        executionProviders: ["wasm"],
        ...extraOptions,
      });
    })();
    sessions.set(key, promise);
    promise.catch(() => sessions.delete(key));
  }
  return promise;
}

// A single InferenceSession must not be re-entered while a run is already in
// flight - concurrent `session.run()` calls on the same session (e.g. the two
// orientations milo-client.ts embeds) can hang the WASM runtime outright,
// freezing the tab, since it's all on the main thread. This queues every run
// per session key so overlapping callers (live detection polling vs. an
// actual capture, or two embeds in one capture) never actually overlap.
const runQueues = new Map<string, Promise<unknown>>();

export function runOnnxSession(
  key: string,
  session: ort.InferenceSession,
  feeds: ort.InferenceSession.OnnxValueMapType,
): Promise<ort.InferenceSession.OnnxValueMapType> {
  const previous = runQueues.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => session.run(feeds));
  runQueues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

export { ort };
