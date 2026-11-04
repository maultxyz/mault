import type {
  InferenceWorkerInitRequest,
  InferenceWorkerRequest,
  InferenceWorkerRunRequest,
  InferenceWorkerScope,
  NavigatorWithWebGpu,
  OnnxExecutionProviderPreference,
} from "@/lib/interfaces/scanner";
import { IMAGENET_MEAN, IMAGENET_STD, rgbaToChw } from "@magic-vault/shared";
import * as ort from "onnxruntime-web/webgpu";

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const scope = globalThis as unknown as InferenceWorkerScope;

let session: ort.InferenceSession | null = null;

function isWasmRuntimeError(error: unknown): boolean {
  return (
    error instanceof WebAssembly.RuntimeError ||
    (error instanceof Error && error.name === "RuntimeError")
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function webgpuAdapterIsAvailable(): Promise<boolean> {
  const gpu = (navigator as NavigatorWithWebGpu).gpu;
  if (!gpu) return false;
  try {
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function createSession(
  request: InferenceWorkerInitRequest,
): Promise<{
  executionProvider: OnnxExecutionProviderPreference;
  webgpuFailureMessage: string | null;
}> {
  const sessionOptions = {
    graphOptimizationLevel: request.runOptions.graphOptimizationLevel,
  };
  let webgpuFailureMessage: string | null = null;
  if (request.executionProvider === "webgpu") {
    if (await webgpuAdapterIsAvailable()) {
      try {
        session = await ort.InferenceSession.create(request.modelBuffer, {
          ...sessionOptions,
          executionProviders: ["webgpu"],
        });
        return { executionProvider: "webgpu", webgpuFailureMessage: null };
      } catch (error) {
        if (isWasmRuntimeError(error)) throw error;
        webgpuFailureMessage = errorMessage(error, "WebGPU session failed.");
      }
    } else {
      webgpuFailureMessage = "No WebGPU adapter is available.";
    }
  }
  session = await ort.InferenceSession.create(request.modelBuffer, {
    ...sessionOptions,
    executionProviders: ["wasm"],
  });
  return { executionProvider: "wasm", webgpuFailureMessage };
}

async function runModel(request: InferenceWorkerRunRequest) {
  if (!session) throw new Error("Inference worker is not ready.");
  const tensorData = rgbaToChw(
    {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.pixels),
    },
    IMAGENET_MEAN,
    IMAGENET_STD,
  );
  const input = new ort.Tensor("float32", tensorData, [
    1,
    3,
    request.height,
    request.width,
  ]);
  let results: ort.InferenceSession.ReturnType | undefined;
  try {
    results = await session.run({ [session.inputNames[0]]: input });
    const outputs: Record<string, Float32Array> = {};
    for (const [name, tensor] of Object.entries(results)) {
      outputs[name] = Float32Array.from(tensor.data as ArrayLike<number>);
    }
    return { outputs, outputNames: [...session.outputNames] };
  } finally {
    input.dispose();
    for (const tensor of Object.values(results ?? {})) tensor.dispose();
  }
}

scope.onmessage = (event) => {
  const request: InferenceWorkerRequest = event.data;
  if (request.type === "init") {
    void createSession(request)
      .then(({ executionProvider, webgpuFailureMessage }) => {
        scope.postMessage({
          type: "ready",
          executionProvider,
          webgpuFailureMessage,
        });
      })
      .catch((error: unknown) => {
        scope.postMessage({
          type: "init-error",
          message: errorMessage(error, "Inference worker failed to start."),
          isWasmRuntimeError: isWasmRuntimeError(error),
        });
      });
    return;
  }
  const { runId } = request;
  void runModel(request)
    .then(({ outputs, outputNames }) => {
      scope.postMessage(
        { type: "result", runId, outputs, outputNames },
        Object.values(outputs).map((output) => output.buffer as ArrayBuffer),
      );
    })
    .catch((error: unknown) => {
      scope.postMessage({
        type: "run-error",
        runId,
        message: errorMessage(error, "Model run failed."),
        isWasmRuntimeError: isWasmRuntimeError(error),
      });
    });
};
