import { INFERENCE_WORKERS_PER_MODEL } from "@/lib/constants/scanner";
import { ONNX_EXECUTION_PROVIDER_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useSyncExternalStore } from "react";
import type { PinnedModel } from "@magic-vault/shared";
import { fetchPinnedModel } from "./model-fetch";
import type {
  InferenceWorkerMessage,
  InferenceWorkerRequest,
  InferenceWorkerWaiter,
  OnnxExecutionProviderPreference,
  PendingInferenceRun,
  VisionModelOutputs,
  VisionModelRunOptions,
} from "@/lib/interfaces/scanner";

const executionProviderListeners = new Set<() => void>();
let webgpuUnavailable = false;

export function getExecutionProviderPreference(): OnnxExecutionProviderPreference {
  try {
    const value = localStorage.getItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    return value === "webgpu" ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

function browserExposesWebgpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function getEffectiveExecutionProvider(): OnnxExecutionProviderPreference {
  return getExecutionProviderPreference() === "webgpu" &&
    !webgpuUnavailable &&
    browserExposesWebgpu()
    ? "webgpu"
    : "wasm";
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
  resetWorkerPools();
  notifyExecutionProviderListeners();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== ONNX_EXECUTION_PROVIDER_STORAGE_KEY) {
      return;
    }
    resetWorkerPools();
    notifyExecutionProviderListeners();
  });
}

function subscribeExecutionProvider(listener: () => void) {
  executionProviderListeners.add(listener);
  return () => {
    executionProviderListeners.delete(listener);
  };
}

export function useExecutionProviderPreference() {
  const preference = useSyncExternalStore(
    subscribeExecutionProvider,
    getExecutionProviderPreference,
  );
  return [preference, setExecutionProviderPreference] as const;
}

export function useEffectiveExecutionProvider(): OnnxExecutionProviderPreference {
  return useSyncExternalStore(
    subscribeExecutionProvider,
    getEffectiveExecutionProvider,
  );
}

let runtimeFailure: Error | null = null;
const runtimeFailureListeners = new Set<() => void>();

function markRuntimeFailed(error: Error): void {
  if (runtimeFailure) return;
  runtimeFailure = error;
  if (getExecutionProviderPreference() === "webgpu") {
    try {
      localStorage.removeItem(ONNX_EXECUTION_PROVIDER_STORAGE_KEY);
    } catch {}
    notifyExecutionProviderListeners();
  }
  resetWorkerPools();
  runtimeFailureListeners.forEach((listener) => listener());
}

function markWebgpuUnavailable(reason: string): void {
  if (webgpuUnavailable) return;
  console.warn(
    `[onnx-runtime] WebGPU session failed, using WASM for every model: ${reason}`,
  );
  webgpuUnavailable = true;
  resetWorkerPools();
  notifyExecutionProviderListeners();
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

function wasmRuntimeError(message: string): Error {
  const error = new Error(message);
  error.name = "RuntimeError";
  return error;
}

class InferenceWorker {
  readonly ready: Promise<void>;
  private readonly worker: Worker;
  private readonly pendingRuns = new Map<number, PendingInferenceRun>();
  private nextRunId = 1;
  private settleReady: InferenceWorkerWaiter<void> | null = null;
  private failure: Error | null = null;

  constructor(
    modelBuffer: ArrayBuffer,
    executionProvider: OnnxExecutionProviderPreference,
  ) {
    this.worker = new Worker(new URL("./inference.worker.ts", import.meta.url), {
      type: "module",
    });
    this.ready = new Promise((resolve, reject) => {
      this.settleReady = { resolve, reject };
    });
    this.worker.onmessage = (event: MessageEvent<InferenceWorkerMessage>) =>
      this.handleMessage(event.data);
    this.worker.onerror = () => {
      const error = new Error("The card recognition worker stopped unexpectedly.");
      markRuntimeFailed(error);
      this.fail(error);
    };
    const request: InferenceWorkerRequest = {
      type: "init",
      modelBuffer,
      executionProvider,
    };
    this.worker.postMessage(request, [modelBuffer]);
  }

  run(imageData: ImageData): Promise<VisionModelOutputs> {
    if (this.failure) return Promise.reject(this.failure);
    const runId = this.nextRunId++;
    const pixels = imageData.data.buffer as ArrayBuffer;
    return new Promise((resolve, reject) => {
      this.pendingRuns.set(runId, { resolve, reject });
      const request: InferenceWorkerRequest = {
        type: "run",
        runId,
        pixels,
        width: imageData.width,
        height: imageData.height,
      };
      this.worker.postMessage(request, [pixels]);
    });
  }

  terminate(): void {
    this.fail(new Error("The card recognition worker was stopped."));
    this.worker.terminate();
  }

  private handleMessage(message: InferenceWorkerMessage): void {
    if (message.type === "ready") {
      if (message.webgpuFailureMessage) {
        markWebgpuUnavailable(message.webgpuFailureMessage);
      }
      this.settleReady?.resolve();
      this.settleReady = null;
      return;
    }
    if (message.type === "init-error") {
      const error = message.isWasmRuntimeError
        ? wasmRuntimeError(message.message)
        : new Error(message.message);
      if (message.isWasmRuntimeError) markRuntimeFailed(error);
      this.fail(error);
      return;
    }
    const pendingRun = this.pendingRuns.get(message.runId);
    if (!pendingRun) return;
    this.pendingRuns.delete(message.runId);
    if (message.type === "result") {
      pendingRun.resolve({
        outputs: message.outputs,
        outputNames: message.outputNames,
      });
      return;
    }
    const error = message.isWasmRuntimeError
      ? wasmRuntimeError(message.message)
      : new Error(message.message);
    if (message.isWasmRuntimeError) markRuntimeFailed(error);
    pendingRun.reject(error);
  }

  private fail(error: Error): void {
    this.failure ??= error;
    this.settleReady?.reject(error);
    this.settleReady = null;
    for (const pendingRun of this.pendingRuns.values()) pendingRun.reject(error);
    this.pendingRuns.clear();
  }
}

const modelBuffers = new Map<string, Promise<ArrayBuffer>>();

function loadModelBuffer(model: PinnedModel): Promise<ArrayBuffer> {
  let buffer = modelBuffers.get(model.sha256);
  if (!buffer) {
    buffer = fetchPinnedModel(model);
    modelBuffers.set(model.sha256, buffer);
    buffer.catch(() => {
      if (modelBuffers.get(model.sha256) === buffer) {
        modelBuffers.delete(model.sha256);
      }
    });
  }
  return buffer;
}

class InferenceWorkerPool {
  private readonly workers = new Set<InferenceWorker>();
  private readonly idleWorkers: InferenceWorker[] = [];
  private readonly waitingRuns: InferenceWorkerWaiter<InferenceWorker>[] = [];
  private readonly model: PinnedModel;
  private readonly alwaysRunOnCpu: boolean;
  private startingWorkerCount = 0;
  private retired = false;

  constructor(model: PinnedModel, runOptions: VisionModelRunOptions) {
    this.model = model;
    this.alwaysRunOnCpu = runOptions.alwaysRunOnCpu ?? false;
  }

  async run(imageData: ImageData): Promise<VisionModelOutputs> {
    const worker = await this.acquireWorker();
    let workerIsHealthy = true;
    try {
      return await worker.run(imageData);
    } catch (error) {
      workerIsHealthy = false;
      throw error;
    } finally {
      this.releaseWorker(worker, workerIsHealthy);
    }
  }

  retire(): void {
    this.retired = true;
    for (const worker of this.idleWorkers.splice(0)) this.removeWorker(worker);
  }

  private acquireWorker(): Promise<InferenceWorker> {
    if (runtimeFailure) return Promise.reject(runtimeFailure);
    const idleWorker = this.idleWorkers.pop();
    if (idleWorker) return Promise.resolve(idleWorker);
    const executionProvider = this.alwaysRunOnCpu
      ? "wasm"
      : getEffectiveExecutionProvider();
    const workerLimit = INFERENCE_WORKERS_PER_MODEL[executionProvider];
    if (this.workers.size + this.startingWorkerCount < workerLimit) {
      return this.startWorker(executionProvider);
    }
    return new Promise((resolve, reject) =>
      this.waitingRuns.push({ resolve, reject }),
    );
  }

  private async startWorker(
    executionProvider: OnnxExecutionProviderPreference,
  ): Promise<InferenceWorker> {
    this.startingWorkerCount++;
    let worker: InferenceWorker | null = null;
    try {
      const modelBuffer = (await loadModelBuffer(this.model)).slice(0);
      worker = new InferenceWorker(modelBuffer, executionProvider);
      await worker.ready;
      this.workers.add(worker);
      return worker;
    } catch (error) {
      worker?.terminate();
      if (this.workers.size === 0 && this.startingWorkerCount === 1) {
        const failure = error instanceof Error ? error : new Error(String(error));
        for (const waiting of this.waitingRuns.splice(0)) waiting.reject(failure);
      }
      throw error;
    } finally {
      this.startingWorkerCount--;
    }
  }

  private releaseWorker(worker: InferenceWorker, workerIsHealthy: boolean): void {
    if (!workerIsHealthy) {
      this.removeWorker(worker);
      if (runtimeFailure) {
        const failure = runtimeFailure;
        for (const waiting of this.waitingRuns.splice(0)) waiting.reject(failure);
        return;
      }
      const waiting = this.waitingRuns.shift();
      if (waiting) this.acquireWorker().then(waiting.resolve, waiting.reject);
      return;
    }
    const waiting = this.waitingRuns.shift();
    if (waiting) {
      waiting.resolve(worker);
      return;
    }
    if (this.retired) {
      this.removeWorker(worker);
      return;
    }
    this.idleWorkers.push(worker);
  }

  private removeWorker(worker: InferenceWorker): void {
    this.workers.delete(worker);
    worker.terminate();
  }
}

const workerPools = new Map<string, InferenceWorkerPool>();

function resetWorkerPools(): void {
  for (const pool of workerPools.values()) pool.retire();
  workerPools.clear();
}

export function runVisionModel(
  modelKey: string,
  model: PinnedModel,
  imageData: ImageData,
  runOptions: VisionModelRunOptions = {},
): Promise<VisionModelOutputs> {
  if (runtimeFailure) return Promise.reject(runtimeFailure);
  let pool = workerPools.get(modelKey);
  if (!pool) {
    pool = new InferenceWorkerPool(model, runOptions);
    workerPools.set(modelKey, pool);
  }
  return pool.run(imageData);
}
