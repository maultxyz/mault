import { serveInferenceWorker } from "@/features/scanner/lib/inference-worker-runtime";
import * as ort from "onnxruntime-web/webgpu";
import ortWasmModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";
import ortWasmBinaryUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";

serveInferenceWorker(ort, { mjs: ortWasmModuleUrl, wasm: ortWasmBinaryUrl });
