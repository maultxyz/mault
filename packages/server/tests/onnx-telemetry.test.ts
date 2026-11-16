import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("ONNX telemetry is disabled before the native module loads, even with an inherited opt-in", () => {
  const output = execFileSync(process.execPath, ["--import", "tsx", "-e", `
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const originalLoad = Module._load;
    let loaded = false;
    Module._load = function (name, ...args) {
      if (name === 'onnxruntime-node') {
        assert.equal(process.env.ORT_DISABLE_TELEMETRY, '1');
        loaded = true;
        return { InferenceSession: {}, Tensor: class Tensor {} };
      }
      return originalLoad.call(this, name, ...args);
    };
    require('./src/lib/onnx-runtime.ts');
    assert.equal(loaded, true);
    console.log('disabled before native initialization');
  `], {
    cwd: process.cwd(),
    env: { ...process.env, ORT_DISABLE_TELEMETRY: "0" },
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.match(output, /disabled before native initialization/);
});
