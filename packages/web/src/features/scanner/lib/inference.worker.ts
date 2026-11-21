import { serveInferenceWorker } from "@/features/scanner/lib/inference-worker-runtime";
import * as ort from "onnxruntime-web/wasm";
import ortWasmModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import ortWasmBinaryUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

serveInferenceWorker(ort, { mjs: ortWasmModuleUrl, wasm: ortWasmBinaryUrl });
