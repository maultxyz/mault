import { ONNX_EXECUTION_PROVIDER_STORAGE_KEY } from "@/lib/constants/storage-keys";
import * as ort from "onnxruntime-web/webgpu";
import { useSyncExternalStore } from "react";
import { fetchPinnedModel, type PinnedModel } from "./model-fetch";

export type OnnxExecutionProviderPreference = "webgpu" | "wasm";

const executionProviderListeners = new Set<() => void>();

export function getExecutionProviderPreference(): OnnxExecutionProviderPreference {
  try {
    const value = localStorage.getItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    return value === "webgpu" ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

export function setExecutionProviderPreference(
  value: OnnxExecutionProviderPreference,
): void {
  try {
    if (value === "wasm") {
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

const sessions = new Map<string, Promise<ort.InferenceSession>>();

let runtimeFailure: Error | null = null;
const runtimeFailureListeners = new Set<() => void>();

function isWasmTrap(err: unknown): err is Error {
  return (
    err instanceof WebAssembly.RuntimeError ||
    (err instanceof Error && err.name === "RuntimeError")
  );
}

function markRuntimeFailed(err: Error): void {
  if (runtimeFailure) return;
  runtimeFailure = err;
  if (getExecutionProviderPreference() === "webgpu") {
    try {
      localStorage.removeItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    } catch {}
    executionProviderListeners.forEach((listener) => listener());
  }
  runtimeFailureListeners.forEach((listener) => listener());
}

export function getOnnxRuntimeFailure(): Error | null {
  return runtimeFailure;
}

function subscribeOnnxRuntimeFailure(listener: () => void) {
  runtimeFailureListeners.add(listener);
  return () => {
    runtimeFailureListeners.delete(listener);
  };
}

export function useOnnxRuntimeFailure(): Error | null {
  return useSyncExternalStore(
    subscribeOnnxRuntimeFailure,
    getOnnxRuntimeFailure,
  );
}

export async function loadOnnxSession(
  key: string,
  model: PinnedModel,
  extraOptions?: Partial<ort.InferenceSession.SessionOptions>,
): Promise<ort.InferenceSession> {
  if (runtimeFailure) throw runtimeFailure;
  let promise = sessions.get(key);
  if (!promise) {
    promise = (async () => {
      const buffer = await fetchPinnedModel(model);
      if (getExecutionProviderPreference() === "webgpu") {
        try {
          return await ort.InferenceSession.create(buffer, {
            executionProviders: ["webgpu", "wasm"],
            ...extraOptions,
          });
        } catch (err) {
          if (isWasmTrap(err)) {
            markRuntimeFailed(err);
            throw err;
          }
          console.warn(
            `[onnx-runtime] ${key}: WebGPU session failed, falling back to WASM`,
            err,
          );
        }
      }
      try {
        return await ort.InferenceSession.create(buffer, {
          executionProviders: ["wasm"],
          ...extraOptions,
        });
      } catch (err) {
        if (isWasmTrap(err)) markRuntimeFailed(err);
        throw err;
      }
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
  const next = previous
    .catch(() => {})
    .then(() => {
      if (runtimeFailure) throw runtimeFailure;
      return session.run(feeds).catch((err) => {
        if (isWasmTrap(err)) markRuntimeFailed(err);
        sessions.delete(key);
        throw err;
      });
    });
  runQueues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

export { ort };
