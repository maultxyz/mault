import { ONNX_EXECUTION_PROVIDER_STORAGE_KEY } from "@/lib/constants/storage-keys";
import * as ort from "onnxruntime-web/webgpu";
import { useSyncExternalStore } from "react";
import { fetchPinnedModel, type PinnedModel } from "./model-fetch";

export type OnnxExecutionProviderPreference = "auto" | "webgpu" | "wasm";

const executionProviderListeners = new Set<() => void>();

export function getExecutionProviderPreference(): OnnxExecutionProviderPreference {
  try {
    const value = localStorage.getItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    return value === "webgpu" || value === "wasm" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function setExecutionProviderPreference(
  value: OnnxExecutionProviderPreference,
): void {
  try {
    if (value === "auto") {
      localStorage.removeItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    } else {
      localStorage.setItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY, value);
    }
  } catch {}

  sessions.clear();
  executionProviderListeners.forEach((listener) => listener());
}

function subscribeExecutionProviderPreference(listener: () => void) {
  executionProviderListeners.add(listener);
  return () => {
    executionProviderListeners.delete(listener);
  };
}

export function useExecutionProviderPreference() {
  const preference = useSyncExternalStore(
    subscribeExecutionProviderPreference,
    getExecutionProviderPreference,
  );
  return [preference, setExecutionProviderPreference] as const;
}

let webGpuSupportPromise: Promise<boolean> | null = null;

function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}

async function detectWebGpuSupport(): Promise<boolean> {
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
      const preference = getExecutionProviderPreference();
      if (preference === "wasm") {
        return ort.InferenceSession.create(buffer, {
          executionProviders: ["wasm"],
          ...extraOptions,
        });
      }
      const preferWebGpu =
        preference === "webgpu" ? true : await isWebGpuSupported();
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

const runQueues = new Map<string, Promise<unknown>>();

export function runOnnxSession(
  key: string,
  session: ort.InferenceSession,
  feeds: ort.InferenceSession.OnnxValueMapType,
): Promise<ort.InferenceSession.OnnxValueMapType> {
  const previous = runQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => session.run(feeds));
  runQueues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

export { ort };
