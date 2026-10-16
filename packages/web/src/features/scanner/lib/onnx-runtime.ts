import { ONNX_EXECUTION_PROVIDER_STORAGE_KEY } from "@/lib/constants/storage-keys";
import * as ort from "onnxruntime-web/webgpu";
import { useSyncExternalStore } from "react";
import type { PinnedModel } from "@magic-vault/shared";
import { fetchPinnedModel } from "./model-fetch";
import type { OnnxExecutionProviderPreference } from "@/lib/interfaces/scanner";

const executionProviderListeners = new Set<() => void>();

export function getExecutionProviderPreference(): OnnxExecutionProviderPreference {
  try {
    const value = localStorage.getItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    return value === "webgpu" ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

function notifyExecutionProviderListeners(): void {
  executionProviderListeners.forEach((listener) => listener());
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

  if (value === "webgpu") webgpuUnavailable = false;
  resetSessions();
  notifyExecutionProviderListeners();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== ONNX_EXECUTION_PROVIDER_STORAGE_KEY) {
      return;
    }
    resetSessions();
    notifyExecutionProviderListeners();
  });
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
const runQueues = new Map<string, Promise<unknown>>();
let webgpuUnavailable = false;

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const next = (runQueues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(task);
  runQueues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

function releaseWhenIdle(
  key: string,
  promise: Promise<ort.InferenceSession>,
): void {
  enqueue(key, async () => {
    const session = await promise;
    await session.release();
  }).catch(() => {});
}

function resetSessions(keep?: string): void {
  for (const [key, promise] of [...sessions]) {
    if (key === keep) continue;
    sessions.delete(key);
    releaseWhenIdle(key, promise);
  }
}

function effectiveExecutionProvider(): OnnxExecutionProviderPreference {
  return getExecutionProviderPreference() === "webgpu" && !webgpuUnavailable
    ? "webgpu"
    : "wasm";
}

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
    notifyExecutionProviderListeners();
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

async function createSession(
  key: string,
  model: PinnedModel,
  extraOptions?: Partial<ort.InferenceSession.SessionOptions>,
): Promise<ort.InferenceSession> {
  const buffer = await fetchPinnedModel(model);
  if (effectiveExecutionProvider() === "webgpu") {
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
        `[onnx-runtime] ${key}: WebGPU session failed, using WASM for every model`,
        err,
      );
      webgpuUnavailable = true;
      resetSessions(key);
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
}

function loadSession(
  key: string,
  model: PinnedModel,
  extraOptions?: Partial<ort.InferenceSession.SessionOptions>,
): Promise<ort.InferenceSession> {
  let promise = sessions.get(key);
  if (!promise) {
    const created = createSession(key, model, extraOptions);
    sessions.set(key, created);
    created.catch(() => {
      if (sessions.get(key) === created) sessions.delete(key);
    });
    promise = created;
  }
  return promise;
}

export function runOnnxModel(
  key: string,
  model: PinnedModel,
  buildFeeds: (
    session: ort.InferenceSession,
  ) => ort.InferenceSession.OnnxValueMapType,
  extraOptions?: Partial<ort.InferenceSession.SessionOptions>,
): Promise<{
  session: ort.InferenceSession;
  outputs: ort.InferenceSession.OnnxValueMapType;
}> {
  return enqueue(key, async () => {
    if (runtimeFailure) throw runtimeFailure;
    const promise = loadSession(key, model, extraOptions);
    const session = await promise;
    if (runtimeFailure) throw runtimeFailure;
    try {
      return { session, outputs: await session.run(buildFeeds(session)) };
    } catch (err) {
      if (isWasmTrap(err)) markRuntimeFailed(err);
      if (sessions.get(key) === promise) {
        sessions.delete(key);
        await session.release().catch(() => {});
      }
      throw err;
    }
  });
}

export { ort };
